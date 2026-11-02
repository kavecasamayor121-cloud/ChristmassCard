/* =========================================================
   Open Me card – navigation · music · text fitting · effects
   ========================================================= */
(() => {
  'use strict';

  const W = 1080, H = 1350;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage  = $('#stage');
  const slides = $$('.slide');
  const input  = $('#nameInput');
  const nameOut = $('#nameOut');
  const muteBtn = $('#mute');

  let current = 0;          // 0 = nothing shown yet
  let busy = false;
  let userName = '';

  /* ---------------------------------------------------------
     1. Scale the 1080x1350 canvas to fit any window
     --------------------------------------------------------- */
  let scale = 1, offX = 0, offY = 0;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    scale = Math.min(vw / W, vh / H);
    offX = (vw - W * scale) / 2;
    offY = (vh - H * scale) / 2;
    stage.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
    sizeCanvas();
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', layout);

  /* ---------------------------------------------------------
     2. Build the dashed button borders (SVG so the dash pattern
        is identical in every browser)
     --------------------------------------------------------- */
  const NS = 'http://www.w3.org/2000/svg';
  $$('.btn').forEach(b => {
    const w = parseFloat(b.style.getPropertyValue('--w'));
    const h = parseFloat(b.style.getPropertyValue('--h'));
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', 2); r.setAttribute('y', 2);
    r.setAttribute('width', w - 4); r.setAttribute('height', h - 4);
    r.setAttribute('rx', 22); r.setAttribute('ry', 22);
    svg.appendChild(r);
    const pulse = document.createElement('span');
    pulse.className = 'pulse';
    b.prepend(pulse, svg);
    const lbl = $('.lbl', b);
    if (lbl) lbl.dataset.t = lbl.textContent.trim();
  });

  /* ---------------------------------------------------------
     3. Fit text: every group of lines is scaled so its width
        matches the original design, whatever font loads.
     --------------------------------------------------------- */
  function fitAll() {
    const typedName = nameOut ? nameOut.textContent : '';
    if (nameOut) nameOut.textContent = 'Name';          // fit against the design text
    const groups = {};
    $$('[data-grp]').forEach(el => (groups[el.dataset.grp] ||= []).push(el));

    for (const [name, els] of Object.entries(groups)) {
      const base = els.find(e => e.dataset.fs);
      if (!base) continue;
      const fs0 = parseFloat(base.dataset.fs);
      els.forEach(e => e.style.setProperty('--fs', fs0));

      const ratios = [];
      els.forEach(e => {
        const target = parseFloat(e.dataset.w);
        if (!target) return;
        const t = e.matches('.lbl') ? e : $('.t', e);
        if (!t) return;
        const w = t.offsetWidth;          // layout width: ignores animation transforms
        if (w > 0) ratios.push(target / w);
      });
      if (!ratios.length) continue;
      ratios.sort((a, b) => a - b);
      const k = ratios[Math.floor(ratios.length / 2)];
      els.forEach(e => e.style.setProperty('--fs', (fs0 * k).toFixed(2)));
    }
    if (nameOut) nameOut.textContent = typedName;
    fitName();
    placeAll();
  }

  /* ---- ink-accurate vertical placement ----
     The original positions were measured on the *ink* of each line. We measure the
     ink of the font that actually loaded and nudge it so it lands on the same spot. */
  const mc = document.createElement('canvas').getContext('2d');
  const EMOJI = /[\p{Extended_Pictographic}\uFE0F\u200d]/gu;
  function metrics(t, text) {
    const cs = getComputedStyle(t);
    const fs = parseFloat(cs.fontSize);
    mc.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const m = mc.measureText(text);
    if (m.fontBoundingBoxAscent === undefined) return null;
    return { fs, aA: m.actualBoundingBoxAscent, aD: m.actualBoundingBoxDescent,
             fA: m.fontBoundingBoxAscent, fD: m.fontBoundingBoxDescent };
  }
  const inkShift = m => ((m.aA - m.aD) - (m.fA - m.fD)) / 2;      // + = move down

  function placeAll() {
    $$('.ln:not(.measure) .t, .btn .lbl, .ln.measure').forEach(t => {
      const ln = t.closest('.ln') || t;
      const raw = ln.dataset.ink || t.textContent;
      const text = raw.replace(EMOJI, '').replace(/\u00a0/g, ' ').trim();
      if (!text) return;
      const tt = t.classList.contains('t') || t.classList.contains('lbl') ? t : $('.t', t);
      const m = metrics(tt, text);
      if (!m) return;
      const dy = inkShift(m);
      if (ln.classList.contains('measure')) {           // the placeholder helper → shifts the real <input>
        input.style.transform = `translateY(${(dy + parseFloat(ln.dataset.dy || 0)).toFixed(1)}px)`;
        return;
      }
      tt.style.top = dy.toFixed(1) + 'px';
      if (ln.dataset.h) {                                // stretch/squash to the original ink height
        const sy = parseFloat(ln.dataset.h) / (m.aA + m.aD);
        ln.style.setProperty('--sy', sy.toFixed(3));
      }
    });
  }

  // long names: shrink only that one line so it never leaves the card
  function fitName() {
    const t = nameOut && nameOut.closest('.t');
    if (!t) return;
    t.style.fontSize = '';
    const w = t.offsetWidth;
    const max = 900;
    if (w > max) t.style.fontSize = (parseFloat(getComputedStyle(t).fontSize) * max / w) + 'px';
    else t.style.fontSize = '';
  }

  /* split the big title into letters so they can drop in one by one */
  function splitLetters() {
    $$('[data-split]').forEach(el => {
      const t = $('.t', el);
      if (t.dataset.done) return;
      const text = t.textContent;
      t.textContent = '';
      [...text].forEach((c, i) => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c === ' ' ? ' ' : c;
        s.style.setProperty('--ci', i);
        t.appendChild(s);
      });
      el.style.setProperty('--ld', (el.dataset.delay || 0) + 's');
      t.dataset.done = 1;
    });
  }

  /* ---- words: every script line is cut into words so they can rise in one by one ---- */
  function splitWords(t, wi) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {                                  // text → words + spaces
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.textContent = p; s.style.setProperty('--wi', wi++);
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          if (n.id === 'nameOut') { n.classList.add('w'); n.style.setProperty('--wi', wi++); }   // the typed name = one word
          else walk(n);
        }
      });
    };
    walk(t);
    return wi;
  }

  /* Choreography: for each slide work out when the text starts (--tb), the gap between
     words (--ws) and when the buttons / END should appear (--bd) – always after the text. */
  function prepareText() {
    slides.forEach(slide => {
      let wi = 0, li = 0;
      $$('.ln:not(.measure)', slide).forEach(ln => {
        ln.style.setProperty('--li', li++);
        if (ln.hasAttribute('data-split') || ln.classList.contains('emoji') || ln.classList.contains('end')) return;
        const t = $('.t', ln);
        if (!t || t.dataset.words) return;
        wi = splitWords(t, wi);
        t.dataset.words = 1;
        ln.classList.add('has-words');
      });
      const delays = $$('.ph', slide).map(p => parseFloat(p.style.getPropertyValue('--d')) || 0);
      const tb   = delays.length ? Math.max(...delays) + 1.1 : .45;   // photo slides: text waits for the photos
      const span = Math.min(1.5, wi * .075);
      const ws   = wi ? span / wi : .075;
      const bd   = slide.querySelector('[data-split]') ? 1.7 : tb + span + .35;
      slide.style.setProperty('--tb', tb.toFixed(2) + 's');
      slide.style.setProperty('--ws', ws.toFixed(3) + 's');
      slide.style.setProperty('--bd', bd.toFixed(2) + 's');
    });
  }

  /* a little sparkle puff when each photo lands */
  function sparklePhotos(slide) {
    if (reduce) return;
    $$('.ph', slide).forEach(ph => {
      const d = parseFloat(ph.style.getPropertyValue('--d')) || 0;
      setTimeout(() => {
        if (!slide.classList.contains('active')) return;
        const r = ph.getBoundingClientRect();
        burst(Math.min(r.right, innerWidth) - 28, Math.max(r.top, 0) + 28, 7);
      }, (d + .7) * 1000);
    });
  }

  /* ---------------------------------------------------------
     4. Music  (Music.mp4, loops, starts on the first click)
     --------------------------------------------------------- */
  const bgm = new Audio('Music.mp4');
  bgm.loop = true; bgm.preload = 'auto'; bgm.volume = 0;
  let musicOn = false, musicStarted = false, fadeT;
  const VOL = 0.75;

  function fadeTo(v, ms = 1200) {
    clearInterval(fadeT);
    const from = bgm.volume, t0 = performance.now();
    fadeT = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      bgm.volume = Math.max(0, Math.min(1, from + (v - from) * p));
      if (p >= 1) { clearInterval(fadeT); if (v === 0) bgm.pause(); }
    }, 40);
  }
  function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    const p = bgm.play();
    if (p && p.then) p.then(() => { musicOn = true; fadeTo(VOL, 2000); showMute(); })
                     .catch(() => { musicStarted = false; });   // try again on the next tap
    else { musicOn = true; showMute(); }
  }
  function showMute() {
    muteBtn.hidden = false;
    muteBtn.classList.toggle('on', musicOn);
    muteBtn.classList.toggle('off', !musicOn);
  }
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (musicOn) { musicOn = false; fadeTo(0, 400); }
    else { musicOn = true; bgm.play().catch(() => {}); fadeTo(VOL, 600); }
    showMute();
  });
  document.addEventListener('visibilitychange', () => {
    if (!musicStarted) return;
    if (document.hidden) bgm.pause();
    else if (musicOn) bgm.play().catch(() => {});
  });

  /* ---------------------------------------------------------
     5. Navigation
     --------------------------------------------------------- */
  /* photos must be decoded before their slide starts, otherwise a big image
     finishes loading after the entrance animation has already played */
  function photosReady(slide) {
    const imgs = $$('.ph img', slide);
    if (!imgs.length) return Promise.resolve();
    const one = i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {});
    return Promise.race([Promise.all(imgs.map(one)), new Promise(r => setTimeout(r, 4000))]);
  }
  function show(n) {
    const next = slides[n - 1];
    if (!next || busy) return;
    busy = true;
    photosReady(next).then(() => { busy = false; doShow(n); });
  }
  function doShow(n) {
    const next = slides[n - 1];
    if (!next || busy) return;
    busy = true;

    const prev = slides[current - 1];
    if (prev) {
      prev.classList.remove('active');
      prev.classList.add('leaving');
      setTimeout(() => prev.classList.remove('leaving'), 600);
    }
    // restart the entrance animations if we come back to a slide
    next.classList.remove('active', 'leaving');
    void next.offsetWidth;
    next.classList.add('active');
    current = n;

    if (n === 2 && matchMedia('(pointer: fine)').matches) setTimeout(() => input.focus({ preventScroll: true }), 1100);
    if (n === 3) { nameOut.textContent = userName; fitName(); setTimeout(() => confetti(innerWidth / 2, innerHeight * 0.3, 40), 500); }
    if (n === 11) setTimeout(() => rain(70), 600);
    sparklePhotos(next);

    setTimeout(() => { busy = false; }, 650);
  }

  function goNext(btn, e) {
    if (busy) return;
    const target = parseInt(btn.dataset.go, 10);

    // slide 2 needs a name
    if (btn.hasAttribute('data-need-name')) {
      const v = input.value.trim();
      if (!v) {
        const f = $('.field');
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
        input.focus();
        return;
      }
      userName = v;
    }
    if (current === 1) startMusic();           // first tap = user gesture → music
    if (e) { ripple(e); burst(e.clientX, e.clientY, 14); }
    show(target);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    // a click that comes from the keyboard has no coordinates – use the button centre
    if (e.clientX === 0 && e.clientY === 0) {
      const r = b.getBoundingClientRect();
      e = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    }
    goNext(b, e);
  });

  /* END → fade the card out, draw the pink curtain, open Feedback.html (name + music position travel along) */
  let leavingPage = false;
  function goFeedback(e) {
    if (busy || leavingPage) return;
    leavingPage = true;
    if (e.clientX === 0 && e.clientY === 0) {
      const r = $('#again').getBoundingClientRect();
      e = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    }
    ripple(e); burst(e.clientX, e.clientY, 22); confetti(e.clientX, e.clientY, 34);
    try {
      sessionStorage.setItem('openme.name', userName);
      sessionStorage.setItem('openme.music', musicOn ? '1' : '0');
      sessionStorage.setItem('openme.t', String(bgm.currentTime || 0));
    } catch (_) {}
    const s = slides[current - 1];
    s.classList.remove('active'); s.classList.add('leaving');
    setTimeout(() => document.body.classList.add('leaving-page'), 420);
    setTimeout(() => { location.href = 'Feedback.html?name=' + encodeURIComponent(userName); }, 1100);
  }
  $('#again').addEventListener('click', goFeedback);

  // coming back with the browser's back button: put the last slide back
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    leavingPage = false;
    document.body.classList.remove('leaving-page');
    const s = slides[current - 1];
    if (s) { s.classList.remove('leaving', 'active'); void s.offsetWidth; s.classList.add('active'); }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('[data-need-name]').click(); }
  });
  input.addEventListener('focus', () => $('.field').classList.add('focus'));
  input.addEventListener('blur',  () => $('.field').classList.remove('focus'));
  input.addEventListener('input', () => { if (input.value) input.classList.remove('empty'); });

  function ripple(e) {
    if (reduce) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = ((e.clientX - offX) / scale) + 'px';
    r.style.top  = ((e.clientY - offY) / scale) + 'px';
    stage.appendChild(r);
    setTimeout(() => r.remove(), 800);
  }

  /* ---------------------------------------------------------
     6. Particles: falling snow/hearts, click bursts, confetti
     --------------------------------------------------------- */
  const cv = $('#fx'), ctx = cv.getContext('2d');
  let dpr = 1, parts = [];
  function sizeCanvas() {
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const PINKS = ['#ff5c8d', '#ff8fb1', '#ff3d7f', '#ffc2d6', '#fff'];
  const heart = (x, y, s, rot, col, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, s * .35);
    ctx.bezierCurveTo(-s * .9, -s * .25, -s * .45, -s * .9, 0, -s * .38);
    ctx.bezierCurveTo(s * .45, -s * .9, s * .9, -s * .25, 0, s * .35);
    ctx.fill(); ctx.restore();
  };

  function ambient() {
    const n = innerWidth < 600 ? 14 : 24;
    for (let i = 0; i < n; i++) parts.push(makeAmbient(true));
  }
  function makeAmbient(anywhere) {
    const isHeart = Math.random() < .4;
    return {
      kind: 'amb', heart: isHeart,
      x: Math.random() * innerWidth, y: anywhere ? Math.random() * innerHeight : -20,
      vx: (Math.random() - .5) * .35, vy: .35 + Math.random() * .7,
      s: isHeart ? 6 + Math.random() * 8 : 2 + Math.random() * 3.2,
      rot: Math.random() * 6, vr: (Math.random() - .5) * .02,
      col: isHeart ? PINKS[Math.floor(Math.random() * 3)] : '#fff',
      a: .35 + Math.random() * .4, ph: Math.random() * 6
    };
  }

  function burst(x, y, n = 14) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
      parts.push({ kind: 'fx', heart: Math.random() < .7, x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: .12,
        s: 6 + Math.random() * 9, rot: Math.random() * 6, vr: (Math.random() - .5) * .25,
        col: PINKS[Math.floor(Math.random() * PINKS.length)], a: 1, life: 1, dec: .012 + Math.random() * .012 });
    }
  }
  function confetti(x, y, n = 40) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, v = 5 + Math.random() * 9;
      parts.push({ kind: 'fx', heart: Math.random() < .55, x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .22,
        s: 5 + Math.random() * 9, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
        col: PINKS[Math.floor(Math.random() * PINKS.length)], a: 1, life: 1, dec: .008 + Math.random() * .008 });
    }
  }
  function rain(n = 60) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      setTimeout(() => parts.push({ kind: 'fx', heart: true, x: Math.random() * innerWidth, y: -20,
        vx: (Math.random() - .5) * .8, vy: 1.5 + Math.random() * 2.5, g: .01,
        s: 7 + Math.random() * 10, rot: Math.random() * 6, vr: (Math.random() - .5) * .08,
        col: PINKS[Math.floor(Math.random() * 4)], a: .95, life: 1, dec: .0022 }), i * 70);
    }
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(2, (t - last) / 16.67); last = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.kind === 'amb') {
        p.ph += .02 * dt;
        p.x += (p.vx + Math.sin(p.ph) * .4) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > innerHeight + 20) { parts[i] = makeAmbient(false); continue; }
        if (p.heart) heart(p.x, p.y, p.s, p.rot, p.col, p.a);
        else { ctx.globalAlpha = p.a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
      } else {
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        p.life -= p.dec * dt; p.vx *= .995;
        if (p.life <= 0 || p.y > innerHeight + 30) { parts.splice(i, 1); continue; }
        const a = Math.min(1, p.life * 1.6) * p.a;
        if (p.heart) heart(p.x, p.y, p.s, p.rot, p.col, a);
        else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = a; ctx.fillStyle = p.col;
               ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     7. Go!
     --------------------------------------------------------- */
  layout();
  splitLetters();
  prepareText();
  fitAll();

  const refit = () => { fitAll(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  addEventListener('load', refit);
  setTimeout(refit, 1200);          // late web-font safety net

  // wait a moment for the background, then reveal slide 1
  const bgImg = $('#bg');
  const start = () => show(1);
  if (bgImg.complete) requestAnimationFrame(start);
  else { bgImg.addEventListener('load', start, { once: true }); bgImg.addEventListener('error', start, { once: true }); }

  slides.forEach(photosReady);              // warm up: decode every photo in the background

  if (!reduce) { ambient(); requestAnimationFrame(frame); }
})();