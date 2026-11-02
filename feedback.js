/* =========================================================
   Feedback page – writing box · Discord webhook · thank-you
   ========================================================= */
(() => {
  'use strict';

  /* ┌──────────────────────────────────────────────────────┐
     │  PASTE YOUR DISCORD WEBHOOK URL HERE                 │
     │  Discord → Server Settings → Integrations → Webhooks │
     │  → New Webhook → Copy Webhook URL                    │
     └──────────────────────────────────────────────────────┘ */
  const WEBHOOK_URL = 'https://discord.com/api/webhooks/1566705617786109953/vS_vv1jDX5nzS0fPtEHo2p5Bj-88yBGFIelC662j3jFGqgfkOKiYazSVa5_S8KNe15Z9';

  const W = 1080, H = 1350, MAX = 800;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage  = $('#stage');
  const slides = $$('.slide');
  const formSlide = slides[0], thanksSlide = slides[1];
  const field  = $('#fbField'), fb = $('#fb'), countEl = $('#count');
  const status = $('#status'), done = $('#done'), fly = $('#fly');
  const veil = $('#veil'), muteBtn = $('#mute');

  /* name arrives from the card (?name=…), with sessionStorage as a back-up */
  let rawName = '';
  try { rawName = new URLSearchParams(location.search).get('name') || sessionStorage.getItem('openme.name') || ''; } catch (_) {}
  const userName = rawName.trim().slice(0, 60);

  /* ---------------------------------------------------------
     1. Scale the 1080x1350 canvas to any window
     --------------------------------------------------------- */
  let scale = 1, offX = 0, offY = 0, lastW = 0;
  function layout(force) {
    // phone keyboard opening only changes the height – keep the card where it is
    if (!force && document.activeElement === fb && innerWidth === lastW) return;
    lastW = innerWidth;
    const vw = innerWidth, vh = innerHeight;
    scale = Math.min(vw / W, vh / H);
    offX = (vw - W * scale) / 2;
    offY = (vh - H * scale) / 2;
    stage.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
    sizeCanvas();
  }
  addEventListener('resize', () => layout());
  addEventListener('orientationchange', () => layout(true));

  /* ---------------------------------------------------------
     2. Dashed button borders (re-drawn whenever the box changes size)
     --------------------------------------------------------- */
  const NS = 'http://www.w3.org/2000/svg';
  $$('.btn').forEach(b => {
    const svg = document.createElementNS(NS, 'svg');
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', 2); r.setAttribute('y', 2); r.setAttribute('rx', 22); r.setAttribute('ry', 22);
    svg.appendChild(r);
    const pulse = document.createElement('span');
    pulse.className = 'pulse';
    b.prepend(pulse, svg);
    const fit = () => {
      const w = b.offsetWidth, h = b.offsetHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      r.setAttribute('width', Math.max(0, w - 4)); r.setAttribute('height', Math.max(0, h - 4));
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(b);
    const lbl = $('.lbl', b);
    if (lbl) lbl.dataset.t = lbl.textContent.trim();
  });
  function setLabel(btn, text) {
    const l = $('.lbl', btn);
    l.textContent = text; l.dataset.t = text;
  }

  /* ---------------------------------------------------------
     3. Words rise in one by one (same choreography as the card)
     --------------------------------------------------------- */
  function splitWords(t, wi) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.textContent = p; s.style.setProperty('--wi', wi++);
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(t);
    return wi;
  }
  function prepareText() {
    slides.forEach(slide => {
      let wi = 0, li = 0;
      $$('.ln', slide).forEach(ln => {
        ln.style.setProperty('--li', li++);
        if (ln.hasAttribute('data-nosplit') || ln.classList.contains('emoji')) return;
        const t = $('.t', ln);
        wi = splitWords(t, wi);
        ln.classList.add('has-words');
      });
      const tb   = .45;
      const span = Math.min(1.5, wi * .075);
      const ws   = wi ? span / wi : .075;
      const bd   = tb + span + .35;
      slide.style.setProperty('--tb', tb + 's');
      slide.style.setProperty('--ws', ws.toFixed(3) + 's');
      slide.style.setProperty('--bd', bd.toFixed(2) + 's');
    });
  }

  // "Thank you, <name>!" – long names shrink so they never leave the card
  const thxLine = $('#thxName');
  $('.t', thxLine).textContent = (userName || 'friend') + '!';
  function fitThanks() {
    thxLine.style.setProperty('--fs', 118);
    const w = $('.t', thxLine).offsetWidth;
    if (w > 900) thxLine.style.setProperty('--fs', (118 * 900 / w).toFixed(1));
  }

  /* ---------------------------------------------------------
     4. Music – picks up where the card left off
     --------------------------------------------------------- */
  const wantMusic = (() => { try { return sessionStorage.getItem('openme.music') === '1'; } catch (_) { return false; } })();
  const bgm = new Audio('Music.mp4');
  bgm.loop = true; bgm.preload = 'auto'; bgm.volume = 0;
  const VOL = .75;
  let musicOn = false, musicStarted = false, fadeT;

  bgm.addEventListener('loadedmetadata', () => {
    try {
      const t = parseFloat(sessionStorage.getItem('openme.t')) || 0;
      if (t && bgm.duration) bgm.currentTime = t % bgm.duration;
    } catch (_) {}
  }, { once: true });

  function fadeTo(v, ms = 1200) {
    clearInterval(fadeT);
    const from = bgm.volume, t0 = performance.now();
    fadeT = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      bgm.volume = Math.max(0, Math.min(1, from + (v - from) * p));
      if (p >= 1) { clearInterval(fadeT); if (v === 0) bgm.pause(); }
    }, 40);
  }
  function showMute() {
    muteBtn.hidden = false;
    muteBtn.classList.toggle('on', musicOn);
    muteBtn.classList.toggle('off', !musicOn);
  }
  function tryStartMusic() {
    if (musicStarted || !wantMusic) return;
    musicStarted = true;
    const ok = () => { musicOn = true; fadeTo(VOL, 1800); showMute();
      removeEventListener('pointerdown', tryStartMusic); removeEventListener('keydown', tryStartMusic); };
    const p = bgm.play();
    if (p && p.then) p.then(ok).catch(() => { musicStarted = false; });   // browser said no → retry on first tap
    else ok();
  }
  addEventListener('pointerdown', tryStartMusic);
  addEventListener('keydown', tryStartMusic);
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (musicOn) { musicOn = false; fadeTo(0, 400); }
    else { musicOn = true; bgm.play().catch(() => {}); fadeTo(VOL, 600); }
    showMute();
  });
  document.addEventListener('visibilitychange', () => {
    if (!musicStarted) return;
    if (document.hidden) bgm.pause(); else if (musicOn) bgm.play().catch(() => {});
  });

  /* ---------------------------------------------------------
     5. Particles
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

  function ripple(e) {
    if (reduce) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = ((e.clientX - offX) / scale) + 'px';
    r.style.top  = ((e.clientY - offY) / scale) + 'px';
    stage.appendChild(r);
    setTimeout(() => r.remove(), 800);
  }
  const centerOf = (el, e) => {
    if (e && !(e.clientX === 0 && e.clientY === 0)) return e;
    const r = el.getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  };
  // Web Animations shake: never fights with the CSS entrance animations
  const shake = el => el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-14px)' }, { transform: 'translateX(12px)' },
     { transform: 'translateX(-8px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
    { duration: 450, easing: 'ease-out' });

  /* ---------------------------------------------------------
     6. The writing box
     --------------------------------------------------------- */
  const updateOpen = () => field.classList.toggle('open', document.activeElement === fb || fb.value.length > 0);
  fb.addEventListener('focus', () => { field.classList.add('focus'); updateOpen(); });
  fb.addEventListener('blur',  () => { field.classList.remove('focus'); updateOpen(); });
  fb.addEventListener('input', () => {
    countEl.textContent = `${fb.value.length} / ${MAX}`;
    updateOpen(); hideStatus();
  });
  fb.addEventListener('keydown', e => {                       // Ctrl / ⌘ + Enter sends
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done.click(); }
  });

  const statusT = $('.t', status);
  function setStatus(text, kind) {
    statusT.textContent = text;
    status.classList.toggle('error', kind === 'error');
    void status.offsetWidth;
    status.classList.add('show');
  }
  function hideStatus() { status.classList.remove('show'); }

  /* ---------------------------------------------------------
     7. Send to Discord
     --------------------------------------------------------- */
  async function sendToDiscord(name, text) {
    if (!/^https:\/\/(discord(app)?\.com)\/api\/webhooks\//.test(WEBHOOK_URL)) {
      const err = new Error('WEBHOOK_URL is not set – open feedback.js and paste your Discord webhook URL.');
      err.code = 'no-webhook';
      throw err;
    }
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctl.signal,
        body: JSON.stringify({
          username: 'Open Me 💌',
          allowed_mentions: { parse: [] },                 // @everyone / @here in a message never pings
          embeds: [{
            title: `💌 New feedback from ${name}`,
            description: text,
            color: 0xff8fb1,
            timestamp: new Date().toISOString(),
            footer: { text: 'Open Me card' }
          }]
        })
      });
      if (!res.ok) { const err = new Error('Discord replied ' + res.status); err.code = res.status; throw err; }
    } finally { clearTimeout(to); }
  }

  let sending = false, sent = false;
  async function submit(e) {
    if (sending || sent) return;
    const text = fb.value.trim();
    if (!text) {
      shake(field);
      setStatus('Write a little something first 💭', 'error');
      fb.focus();
      return;
    }
    sending = true;
    fb.readOnly = true; fb.blur();
    field.classList.add('sending'); done.classList.add('sending');
    setLabel(done, 'SENDING');
    hideStatus();
    if (e) { ripple(e); burst(e.clientX, e.clientY, 10); }

    const t0 = performance.now();
    try {
      await sendToDiscord(userName || 'Anonymous', text);
      await sleep(Math.max(0, 1000 - (performance.now() - t0)));   // never flash by too fast
      sent = true;
      success();
    } catch (err) {
      console.error('[Feedback]', err);
      await sleep(Math.max(0, 700 - (performance.now() - t0)));
      sending = false;
      fb.readOnly = false;
      field.classList.remove('sending'); done.classList.remove('sending');
      setLabel(done, 'DONE');
      shake(done);
      setStatus(err.code === 'no-webhook' ? "Feedback isn't connected yet 😢"
              : err.code === 429          ? 'Too many tries, wait a moment 💤'
              :                             "Couldn't send. Tap DONE to try again", 'error');
    }
  }
  done.addEventListener('click', e => submit(centerOf(done, e)));

  function success() {
    formSlide.classList.add('out');                         // box melts away, 💌 takes off (CSS)
    const t = $('.t', fly), start = performance.now() + 350;
    const trail = setInterval(() => {                       // sparkle trail behind the envelope
      const now = performance.now();
      if (now < start) return;
      if (now - start > 1500) { clearInterval(trail); return; }
      const r = t.getBoundingClientRect();
      if (r.width) burst(r.left + r.width / 2, r.top + r.height / 2, 2);
    }, 90);
    setTimeout(() => confetti(innerWidth / 2, innerHeight * .2, 46), 1300);
    setTimeout(() => { show(thanksSlide); fitThanks(); setTimeout(() => rain(60), 500); }, 1750);
  }

  /* ---------------------------------------------------------
     8. Slide switching + "Watch again"
     --------------------------------------------------------- */
  function show(next) {
    const prev = slides.find(s => s.classList.contains('active'));
    if (prev && prev !== next) {
      prev.classList.remove('active'); prev.classList.add('leaving');
      setTimeout(() => prev.classList.remove('leaving'), 600);
    }
    next.classList.remove('active', 'leaving');
    void next.offsetWidth;
    next.classList.add('active');
  }

  let leaving = false;
  $('#again').addEventListener('click', e => {
    if (leaving) return;
    leaving = true;
    e = centerOf($('#again'), e);
    ripple(e); burst(e.clientX, e.clientY, 18);
    try { sessionStorage.setItem('openme.music', musicOn ? '1' : '0'); sessionStorage.setItem('openme.t', String(bgm.currentTime || 0)); } catch (_) {}
    thanksSlide.classList.remove('active'); thanksSlide.classList.add('leaving');
    setTimeout(() => {
      veil.classList.remove('arrive'); void veil.offsetWidth;   // drop the arrival animation, then fade the curtain in
      document.body.classList.add('leaving-page');
    }, 420);
    setTimeout(() => { location.href = 'index.html'; }, 1100);
  });
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    leaving = false; document.body.classList.remove('leaving-page');
    const s = slides.find(x => x.classList.contains('leaving') || x.classList.contains('active')) || thanksSlide;
    s.classList.remove('leaving', 'active'); void s.offsetWidth; s.classList.add('active');
  });

  /* ---------------------------------------------------------
     9. Go!
     --------------------------------------------------------- */
  layout(true);
  prepareText();
  fitThanks();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitThanks);
  addEventListener('load', fitThanks);

  const bgImg = $('#bg');
  const start = () => { show(formSlide); tryStartMusic(); };
  if (bgImg.complete) requestAnimationFrame(start);
  else { bgImg.addEventListener('load', start, { once: true }); bgImg.addEventListener('error', start, { once: true }); }

  if (!reduce) { for (let i = 0; i < (innerWidth < 600 ? 14 : 24); i++) parts.push(makeAmbient(true)); requestAnimationFrame(frame); }
})();
