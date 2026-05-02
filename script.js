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
     PIXEL PET — station-based companion
     ============================================================ */
  class PixelPet {
    constructor(el) {
      this.el = el;
      this.size = 36;
      this.x = window.innerWidth - 60;
      this.y = window.innerHeight * 0.3;
      this.tx = this.x;
      this.ty = this.y;
      this.flip = 1;          /* 1 = facing right, -1 = facing left */
      this.frame = 'idle1';
      this.state = 'idle';    /* idle | walking | acting */
      this.action = null;     /* action being performed at destination */
      this.actionStart = 0;
      this.idleTick = 0;
      this.walkTick = 0;
      this.idlePhase = 0;     /* 0 = idle1, 1 = idle2 */
      this.lastBlink = 0;
      this.activeStation = null;
      this.stations = this.scanStations();
      this.applyTransform();
      this.tick = this.tick.bind(this);
      requestAnimationFrame(this.tick);
      window.addEventListener('resize', () => this.invalidate(), { passive: true });
    }

    scanStations() {
      return Array.from(document.querySelectorAll('[data-pet-station]')).map((node) => ({
        node,
        action: node.dataset.petAction || 'idle',
        anchor: node.dataset.petAnchor || 'right',
      }));
    }

    invalidate() {
      /* Force a station re-pick on next frame */
      this.activeStation = null;
    }

    pickStation() {
      /* Find station whose center is closest to viewport center */
      const vh = window.innerHeight;
      const center = vh * 0.5;
      let best = null, bestD = Infinity;
      for (const s of this.stations) {
        const r = s.node.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;   /* offscreen */
        const stationY = r.top + r.height * 0.5;
        const d = Math.abs(stationY - center);
        if (d < bestD) { bestD = d; best = s; }
      }
      return best;
    }

    computeTarget(station) {
      const r = station.node.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padX = 14;
      const topbarH = 80;
      const half = this.size / 2;
      let x, y;
      switch (station.anchor) {
        case 'left':
          x = r.left - this.size - 18;
          y = r.top + Math.min(28, r.height * 0.18);
          break;
        case 'below':
          x = r.left + r.width * 0.5 - half;
          y = r.bottom + 14;
          break;
        case 'above':
          x = r.left + r.width * 0.5 - half;
          y = r.top - this.size - 14;
          break;
        case 'below-right':
          x = r.right - this.size - 4;
          y = r.bottom + 14;
          break;
        case 'right':
        default:
          x = r.right + 18;
          y = r.top + Math.min(28, r.height * 0.18);
      }
      /* Bound inside viewport (account for topbar + edges) */
      x = Math.max(padX, Math.min(x, vw - this.size - padX));
      y = Math.max(topbarH, Math.min(y, vh - this.size - 24));
      return { x, y };
    }

    setFrame(name) {
      if (this.frame === name) return;
      this.frame = name;
      this.el.dataset.petFrame = name;
    }

    applyTransform() {
      this.el.style.setProperty('--pet-x', this.x.toFixed(1) + 'px');
      this.el.style.setProperty('--pet-y', this.y.toFixed(1) + 'px');
      this.el.style.setProperty('--pet-flip', String(this.flip));
    }

    startAction(action) {
      this.state = 'acting';
      this.action = action;
      this.actionStart = performance.now();
      switch (action) {
        case 'wave':     this.setFrame('wave');     break;
        case 'jump':     this.setFrame('jump');     break;
        case 'surprise': this.setFrame('surprise'); break;
        case 'clap':     this.setFrame('clap1');    break;
        default:         this.setFrame('idle1');    this.state = 'idle'; this.action = null;
      }
    }

    tick(now) {
      const dt = 16; /* fixed virtual step for stability */

      /* 1. Pick the closest station; if it changed, set a new target */
      const station = this.pickStation();
      if (station && station !== this.activeStation) {
        this.activeStation = station;
      }
      if (this.activeStation) {
        const t = this.computeTarget(this.activeStation);
        this.tx = t.x;
        this.ty = t.y;
      }

      /* 2. Move toward target if not yet there */
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const dist = Math.hypot(dx, dy);
      const arriveThreshold = 1.5;

      if (dist > arriveThreshold) {
        /* Walking */
        this.state = 'walking';
        const maxStep = 5.5;          /* px per frame */
        const step = Math.min(maxStep, dist * 0.18);
        const nx = step / dist;
        this.x += dx * nx;
        this.y += dy * nx;
        if (Math.abs(dx) > 0.5) this.flip = dx >= 0 ? 1 : -1;
        /* Cycle walk frames every ~180ms */
        this.walkTick += dt;
        if (this.walkTick >= 180) {
          this.setFrame(this.frame === 'walk1' ? 'walk2' : 'walk1');
          this.walkTick = 0;
        }
        if (this.frame !== 'walk1' && this.frame !== 'walk2') {
          this.setFrame('walk1');
        }
        this.action = null;          /* will trigger on arrival */
      } else {
        /* Arrived */
        this.x = this.tx; this.y = this.ty;
        const targetAction = this.activeStation ? this.activeStation.action : 'idle';

        if (this.state === 'walking') {
          /* Trigger contextual action ONCE on arrival */
          if (targetAction && targetAction !== 'idle') {
            this.startAction(targetAction);
          } else {
            this.state = 'idle';
            this.action = null;
            this.setFrame('idle1');
            this.idleTick = 0;
          }
        } else if (this.state === 'acting') {
          /* Run the action animation for ~1100ms then return to idle */
          const elapsed = now - this.actionStart;
          if (this.action === 'clap') {
            /* Alternate clap1/clap2 every 160ms */
            const phase = Math.floor(elapsed / 160) % 2;
            this.setFrame(phase === 0 ? 'clap1' : 'clap2');
          }
          if (elapsed > 1200) {
            this.state = 'idle';
            this.action = null;
            this.setFrame('idle1');
            this.idleTick = 0;
          }
        } else {
          /* Idle: breath cycle + occasional blink */
          this.idleTick += dt;
          if (this.idleTick >= 700) {
            this.idlePhase = this.idlePhase === 0 ? 1 : 0;
            this.setFrame(this.idlePhase === 0 ? 'idle1' : 'idle2');
            this.idleTick = 0;
            /* random blink ~12% of cycles */
            if (Math.random() < 0.12 && now - this.lastBlink > 2400) {
              this.lastBlink = now;
              this.setFrame('blink');
              setTimeout(() => {
                if (this.state === 'idle') {
                  this.setFrame(this.idlePhase === 0 ? 'idle1' : 'idle2');
                }
              }, 160);
            }
          }
        }
      }

      this.applyTransform();
      requestAnimationFrame(this.tick);
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

  /* Reveals — staggered translateY + fade */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
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
})();
