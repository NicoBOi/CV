/* ============================================================
   nicolassempere.com — refonte
   - Lenis smooth scroll
   - GSAP/ScrollTrigger : reveals, theme swap
   - Pixel pet : station-based travel + contextual animations
   - Scroll progress bar
   ============================================================ */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year stamp ---------- */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Showreel play ---------- */
  const reelBtn   = document.querySelector('[data-reel-play]');
  const reelVideo = document.querySelector('[data-showreel]');
  if (reelBtn && reelVideo) {
    reelBtn.addEventListener('click', () => {
      const hasSrc = reelVideo.querySelector('source') || reelVideo.src;
      if (!hasSrc) {
        reelBtn.setAttribute('aria-disabled', 'true');
        const lbl = reelBtn.querySelector('.reel__play-label');
        if (lbl) lbl.textContent = 'Showreel · à venir';
        return;
      }
      reelVideo.setAttribute('data-played', '');
      reelVideo.muted = false;
      reelVideo.play().catch(() => {});
    });
  }

  /* ---------- Scroll progress bar ---------- */
  const progressEl = document.querySelector('[data-progress]');
  function updateProgress() {
    if (!progressEl) return;
    const h = document.documentElement;
    const max = h.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
    progressEl.style.width = (p * 100).toFixed(2) + '%';
  }
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });

  /* ============================================================
     PIXEL PET — orthogonal anchor-based guide (Game Boy style)
     Position computed from scrollY against a fixed list of anchors.
     Movement is strictly orthogonal: between two anchors, the pet
     moves first along the long axis (X or Y), then the other —
     forming an L. Snap to anchor when within 4px. 100ms turn pose
     when axis switches.
     ============================================================ */

  /* ============================================================
     PHASE 2 — split text into characters for reactive titles.
     Preserves nested structure (em, strong, .hero__line, etc.).
     ============================================================ */
  function splitChars(root) {
    if (!root || root.dataset.charsSplit) return;
    root.dataset.charsSplit = '1';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentElement && n.parentElement.closest('script, style, [data-no-split]')) continue;
      textNodes.push(n);
    }
    textNodes.forEach((node) => {
      const text = node.textContent;
      if (!text || !text.trim()) return;
      const frag = document.createDocumentFragment();
      for (const ch of text) {
        if (ch === ' ' || ch === ' ') {
          frag.appendChild(document.createTextNode(ch));
        } else if (ch === '\n' || ch === '\t') {
          frag.appendChild(document.createTextNode(ch));
        } else {
          const s = document.createElement('span');
          s.className = 'char';
          s.textContent = ch;
          frag.appendChild(s);
        }
      }
      node.parentNode.replaceChild(frag, node);
    });
  }

  const SPLIT_TARGETS = [
    '.hero__title',
    '.travail__title',
    '.parcours__title',
    '.case__title',
    '.pilier__title',
    '.timeline__role',
  ];
  if (!reduced) SPLIT_TARGETS.forEach((sel) => document.querySelectorAll(sel).forEach(splitChars));

  /* Selectors for "zone" reactivity (whole element gets is-pet-near). */
  const PET_ZONE_SELECTORS = [
    '.cta',
    '.case',
    '.case__media',
    '.reel__frame',
    '.timeline__row',
    '.section__label',
  ];

  /* List of CSS selectors for guide anchors, in scroll order.
     Each is a key element the pet should point to on the page. */
  const PET_ANCHOR_SELECTORS = [
    '#hero-title',
    '.hero__tag',
    '#showreel .reel__frame',
    '.reel__caption',
    '.pitch__lede',
    '.travail__title',
    '#travail .case:nth-of-type(1) .case__title',
    '#travail .case:nth-of-type(2) .case__title',
    '#travail .case:nth-of-type(3) .case__title',
    '.production__quote',
    '.production__cta',
    '.parcours__title',
    '.closer',
    '.closer__sla',
  ];

  class PixelPet {
    constructor(el) {
      this.el = el;
      this.size = 32;
      this.anchors = [];
      this.x = 0; this.y = 0;
      this.lastX = 0; this.lastY = 0;
      this.flip = 1;
      this.frame = 'idle1';
      this.idlePhase = 0;
      this.lastFrameSwap = 0;
      this.lastBlink = 0;
      this.lastMoveAt = 0;
      this.phase = null;          /* 'X' or 'Y' — current axis of L motion */
      this.turnUntil = 0;
      this.turnStart = 0;
      this.chars = [];           /* {el, docX, docY} pour réactivité par lettre */
      this.zones = [];           /* {el, l, t, r, b} pour réactivité de zones */
      this.zoneState = new WeakMap();
      this.proximityAccum = 0;   /* throttle léger du recompute des près-d'ici */
      this.computeAnchors();
      this.computeReactiveTargets();
      this.tick = this.tick.bind(this);

      let resizeT = null;
      const onResize = () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => {
          this.computeAnchors();
          this.computeReactiveTargets();
        }, 200);
      };
      window.addEventListener('resize', onResize, { passive: true });
      /* Recompute on theme swap (layout shifts subtilement avec font-display) */
      const mo = new MutationObserver(onResize);
      mo.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

      requestAnimationFrame(this.tick);
    }

    computeReactiveTargets() {
      this.chars = [];
      document.querySelectorAll('.char').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        this.chars.push({
          el,
          docX: r.left + r.width / 2 + window.scrollX,
          docY: r.top + r.height / 2 + window.scrollY,
        });
      });
      this.zones = [];
      PET_ZONE_SELECTORS.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          this.zones.push({
            el,
            l: r.left + window.scrollX,
            t: r.top + window.scrollY,
            r: r.right + window.scrollX,
            b: r.bottom + window.scrollY,
          });
        });
      });
    }

    /* Compute anchor positions in DOCUMENT coords (absolute on page).
       Anchor is positioned to the LEFT of the element (pet acts as
       guide pointing at the start of the text/visual). */
    computeAnchors() {
      const PET_W = this.size;
      const GAP = 14;
      const list = [];
      for (const sel of PET_ANCHOR_SELECTORS) {
        const node = document.querySelector(sel);
        if (!node) continue;
        const r = node.getBoundingClientRect();
        const docX = Math.max(8, r.left + window.scrollX - PET_W - GAP);
        const docY = r.top + window.scrollY - 4;
        list.push({ docX, docY, sel });
      }
      list.sort((a, b) => a.docY - b.docY);
      this.anchors = list;
    }

    setFrame(name) {
      if (this.frame === name) return;
      this.frame = name;
      this.el.dataset.petFrame = name;
    }

    tick(now) {
      if (this.anchors.length < 2) {
        requestAnimationFrame(this.tick);
        return;
      }

      const scrollY = window.scrollY;
      /* Reference Y in document coords — where in the page the reader's
         eye is currently positioned. 40% of viewport feels natural. */
      const ref = scrollY + window.innerHeight * 0.4;

      /* Find bracketing anchors (a = before, b = after) */
      let i = 0;
      while (i < this.anchors.length - 1 && this.anchors[i + 1].docY <= ref) i++;
      const a = this.anchors[i];
      const b = this.anchors[Math.min(i + 1, this.anchors.length - 1)];

      let petDocX, petDocY, currentPhase = this.phase;

      if (a === b) {
        petDocX = a.docX;
        petDocY = a.docY;
      } else {
        const denom = b.docY - a.docY || 1;
        const t = Math.max(0, Math.min(1, (ref - a.docY) / denom));
        const dx = b.docX - a.docX;
        const dy = b.docY - a.docY;
        const yFirst = Math.abs(dy) >= Math.abs(dx);

        if (yFirst) {
          if (t < 0.5) {
            petDocX = a.docX;
            petDocY = a.docY + dy * (t * 2);
            currentPhase = 'Y';
          } else {
            petDocX = a.docX + dx * ((t - 0.5) * 2);
            petDocY = b.docY;
            currentPhase = 'X';
          }
        } else {
          if (t < 0.5) {
            petDocX = a.docX + dx * (t * 2);
            petDocY = a.docY;
            currentPhase = 'X';
          } else {
            petDocX = b.docX;
            petDocY = a.docY + dy * ((t - 0.5) * 2);
            currentPhase = 'Y';
          }
        }
      }

      /* Snap if within 4px of either anchor */
      for (const an of [a, b]) {
        if (Math.abs(petDocX - an.docX) < 4 && Math.abs(petDocY - an.docY) < 4) {
          petDocX = an.docX;
          petDocY = an.docY;
          break;
        }
      }

      /* Detect axis change → trigger 100ms turn pose */
      if (this.phase !== null && currentPhase !== this.phase) {
        this.turnUntil = now + 100;
        this.turnStart = now;
      }
      this.phase = currentPhase;

      /* Convert to viewport coords */
      const vx = petDocX;
      const vy = petDocY - scrollY;

      /* Velocity for walk/idle */
      const dxp = vx - this.lastX;
      const dyp = vy - this.lastY;
      const speed = Math.hypot(dxp, dyp);

      if (speed > 0.5) {
        if (Math.abs(dxp) > 0.4) this.flip = dxp > 0 ? 1 : -1;
        this.lastMoveAt = now;
      }

      const idleSince = now - this.lastMoveAt;
      const inTurn = now < this.turnUntil;

      /* Frame selection (3 states: idle / walk / turn) */
      if (inTurn) {
        const e = now - this.turnStart;
        this.setFrame(e < 50 ? 'turn1' : 'turn2');
      } else if (speed > 0.5 || idleSince < 200) {
        if (now - this.lastFrameSwap > 130) {
          this.setFrame(this.frame === 'walk1' ? 'walk2' : 'walk1');
          this.lastFrameSwap = now;
        }
        if (this.frame !== 'walk1' && this.frame !== 'walk2') {
          this.setFrame('walk1');
          this.lastFrameSwap = now;
        }
      } else {
        if (now - this.lastFrameSwap > 700) {
          this.idlePhase ^= 1;
          this.setFrame(this.idlePhase ? 'idle2' : 'idle1');
          this.lastFrameSwap = now;
        }
      }

      /* Apply transform — pixel-snapped */
      this.el.style.setProperty('--pet-x', Math.round(vx) + 'px');
      this.el.style.setProperty('--pet-y', Math.round(vy) + 'px');
      this.el.style.setProperty('--pet-flip', String(this.flip));

      this.lastX = vx;
      this.lastY = vy;

      /* PHASE 2 — réactivité de l'environnement (~80px de rayon).
         Throttle à ~30fps pour les checks (1 frame sur 2). */
      this.proximityAccum++;
      if (this.proximityAccum >= 2) {
        this.proximityAccum = 0;
        this.updateProximity(petDocX + 16, petDocY + 16);
      }

      requestAnimationFrame(this.tick);
    }

    updateProximity(petCX, petCY) {
      const R = 56;
      const R2 = R * R;

      /* Letters within radius — use proximity as intensity 0..1. */
      for (let i = 0; i < this.chars.length; i++) {
        const c = this.chars[i];
        const dx = c.docX - petCX;
        const dy = c.docY - petCY;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const intensity = 1 - Math.sqrt(d2) / R;
          c.el.style.setProperty('--char-near', intensity.toFixed(3));
          if (!c.el.classList.contains('is-near')) c.el.classList.add('is-near');
        } else if (c.el.classList.contains('is-near')) {
          c.el.classList.remove('is-near');
          c.el.style.removeProperty('--char-near');
        }
      }

      /* Zones — distance to closest point on rect, single class toggle. */
      for (let i = 0; i < this.zones.length; i++) {
        const z = this.zones[i];
        const dx = Math.max(z.l - petCX, 0, petCX - z.r);
        const dy = Math.max(z.t - petCY, 0, petCY - z.b);
        const d2 = dx * dx + dy * dy;
        const inside = d2 < R2;
        const was = this.zoneState.get(z.el) === true;
        if (inside && !was) {
          z.el.classList.add('is-pet-near');
          this.zoneState.set(z.el, true);
        } else if (!inside && was) {
          z.el.classList.remove('is-pet-near');
          this.zoneState.set(z.el, false);
        }
      }
    }
  }

  /* Init pet (only if visible — CSS hides it on mobile) */
  const petEl = document.querySelector('[data-pet]');
  if (petEl && !reduced && window.innerWidth > 640) {
    new PixelPet(petEl);
  } else if (petEl) {
    /* Static idle frame when reduced motion or mobile */
    petEl.dataset.petFrame = 'idle1';
  }

  /* ============================================================
     LENIS + GSAP — reveals + theme swap
     ============================================================ */
  const hasGSAP  = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  if (reduced || !hasGSAP) {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
    setupThemeFallback();
    return;
  }

  if (hasLenis) {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', () => { ScrollTrigger.update(); updateProgress(); });
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Reveals — translateY + fade (skip enfants gérés par parent stagger) */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    if (el.closest('[data-reveal-stagger]') && el.parentElement.hasAttribute('data-reveal-stagger')) return;
    gsap.fromTo(el,
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.95, ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => el.classList.add('is-revealed'),
        },
      }
    );
  });

  /* Hero — initial entrance choreography */
  const heroLines = gsap.utils.toArray('#hero [data-reveal]');
  if (heroLines.length) {
    gsap.set(heroLines, { y: 36, opacity: 0 });
    gsap.to(heroLines, {
      y: 0, opacity: 1,
      duration: 1.1, ease: 'power3.out',
      stagger: 0.10, delay: 0.1,
      onComplete: () => heroLines.forEach((el) => el.classList.add('is-revealed')),
    });
  }

  /* Theme swap per section */
  gsap.utils.toArray('.section[data-section-theme]').forEach((sec) => {
    const t = sec.dataset.sectionTheme;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter:     () => setTheme(t),
      onEnterBack: () => setTheme(t),
    });
  });
  function setTheme(t) {
    if (document.body.dataset.theme !== t) document.body.dataset.theme = t;
  }

  function setupThemeFallback() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.target.dataset.sectionTheme) {
          document.body.dataset.theme = e.target.dataset.sectionTheme;
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.section[data-section-theme]').forEach((s) => io.observe(s));
  }

  /* ============================================================
     PHASE 2 — caret, scramble, typewriter, stagger, rail nav
     ============================================================ */

  /* Caret violet à la fin des citations clés. */
  if (!reduced) {
    document.querySelectorAll('[data-caret]').forEach((el) => {
      const last = (function findLastTextHost(node) {
        let cur = node, found = node;
        while (cur && cur.lastChild) {
          if (cur.lastChild.nodeType === 1) { cur = cur.lastChild; found = cur; }
          else break;
        }
        return found;
      })(el);
      const caret = document.createElement('span');
      caret.className = 'caret';
      caret.setAttribute('aria-hidden', 'true');
      last.appendChild(caret);
    });
  }

  /* Stagger reveals — animer les enfants avec un décalage. */
  if (!reduced && typeof window.gsap !== 'undefined') {
    document.querySelectorAll('[data-reveal-stagger]').forEach((parent) => {
      const kids = Array.from(parent.children);
      if (!kids.length) return;
      gsap.fromTo(kids,
        { y: 12, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: parent,
            start: 'top 85%',
            once: true,
            onEnter: () => parent.classList.add('is-revealed'),
          },
        }
      );
    });
  }

  /* Scramble : enchainement rapide de chiffres avant valeur finale.
     S'applique aux .timeline__year et .case__period. */
  function scramble(el, finalText, dur) {
    const chars = '0123456789§§%#';
    const start = performance.now();
    const orig = finalText.split('');
    el.classList.add('is-scrambling');
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const settledCount = Math.floor(orig.length * t);
      let out = '';
      for (let i = 0; i < orig.length; i++) {
        if (i < settledCount || /\s/.test(orig[i])) out += orig[i];
        else out += chars[(Math.random() * chars.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(step);
      else { el.textContent = finalText; el.classList.remove('is-scrambling'); }
    }
    requestAnimationFrame(step);
  }

  if (!reduced && 'IntersectionObserver' in window) {
    const SCRAMBLE_SEL = '.timeline__year, .case__period';
    const scrambleIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.dataset.scrambled) return;
        el.dataset.scrambled = '1';
        const final = el.textContent;
        scramble(el, final, 380);
        scrambleIO.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll(SCRAMBLE_SEL).forEach((el) => {
      el.dataset.scramble = '1';
      scrambleIO.observe(el);
    });
  }

  /* Typewriter : section numbers se tapent caractère par caractère. */
  if (!reduced && 'IntersectionObserver' in window) {
    const typeIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.dataset.typed) return;
        el.dataset.typed = '1';
        const finalChars = Array.from(el.textContent);
        el.textContent = '';
        let i = 0;
        function step() {
          if (i >= finalChars.length) return;
          el.textContent += finalChars[i++];
          setTimeout(step, 55 + Math.random() * 35);
        }
        step();
        typeIO.unobserve(el);
      });
    }, { threshold: 0.7 });
    document.querySelectorAll('.section__num').forEach((el) => {
      el.dataset.typewriter = '1';
      typeIO.observe(el);
    });
  }

  /* Rail nav — état actif synchro avec la section visible. */
  const railLinks = document.querySelectorAll('.rail a[href^="#"]');
  if (railLinks.length && 'IntersectionObserver' in window) {
    const map = new Map();
    railLinks.forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, a);
    });
    const railIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const a = map.get(e.target);
        if (!a) return;
        if (e.isIntersecting && e.intersectionRatio > 0.45) {
          railLinks.forEach((x) => x.classList.remove('is-active'));
          a.classList.add('is-active');
        }
      });
    }, { threshold: [0.45, 0.55] });
    map.forEach((_, sec) => railIO.observe(sec));
    /* Scroll smooth via Lenis ou natif (la page fournit déjà smooth). */
  }
})();
