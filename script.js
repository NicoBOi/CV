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
     PIXEL PET — scroll-bound 8-bit walker
     Position is bound directly to scrollY progress on a serpentine
     path. Walk cycle plays while scroll velocity > 0; switches to
     idle (breath / blink / occasional nod) after ~300ms inactivity.
     Sprite flips horizontally when scroll direction reverses.
     ============================================================ */
  class PixelPet {
    constructor(el) {
      this.el = el;
      this.size = 36;
      const init = this.pathFromProgress(this.currentProgress());
      this.x = init.x - this.size / 2;
      this.y = init.y - this.size / 2;
      this.tx = this.x;
      this.ty = this.y;
      this.flip = 1;
      this.frame = 'idle1';
      this.distAccum = 0;        /* px walked since last frame swap */
      this.idleTick = 0;
      this.idlePhase = 0;
      this.lastBlink = 0;
      this.lastScrollY = window.scrollY;
      this.lastMoveAt = performance.now();
      this.nodStart = 0;
      this.tick = this.tick.bind(this);
      this.applyTransform();
      this.el.dataset.petFrame = this.frame;
      requestAnimationFrame(this.tick);
    }

    currentProgress() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    }

    /* Serpentine path through viewport, parametrized by scroll progress.
       X uses a cosine wave (1.5 cycles across full scroll) so the pet
       weaves between margins. Y is linear: top of viewport at start,
       bottom of viewport at end. */
    pathFromProgress(p) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const yMin = 90;
      const yMax = vh - 60;
      const y = yMin + p * (yMax - yMin);
      const xCenter = vw * 0.5;
      const xRange = Math.min(vw * 0.42, vw / 2 - 30);
      const x = xCenter + Math.cos(p * Math.PI * 3) * xRange;
      return { x, y };
    }

    setFrame(name) {
      if (this.frame === name) return;
      this.frame = name;
      this.el.dataset.petFrame = name;
    }

    applyTransform() {
      const px = Math.round(this.x);
      const py = Math.round(this.y + this.nodOffset());
      this.el.style.setProperty('--pet-x', px + 'px');
      this.el.style.setProperty('--pet-y', py + 'px');
      this.el.style.setProperty('--pet-flip', String(this.flip));
    }

    nodOffset() {
      if (!this.nodStart) return 0;
      const t = (performance.now() - this.nodStart) / 280;
      if (t >= 1) { this.nodStart = 0; return 0; }
      /* small dip then return: sin pulse */
      return Math.sin(t * Math.PI) * 1.6;
    }

    tick(now) {
      const scrollY = window.scrollY;
      const progress = this.currentProgress();
      const target = this.pathFromProgress(progress);
      this.tx = target.x - this.size / 2;
      this.ty = target.y - this.size / 2;

      /* Scroll direction → sprite flip (down = right, up = left) */
      const sdy = scrollY - this.lastScrollY;
      if (Math.abs(sdy) > 0.4) {
        this.flip = sdy > 0 ? 1 : -1;
        this.lastMoveAt = now;
      }
      this.lastScrollY = scrollY;

      /* Lerp toward target — light easing so movement isn't sharp */
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.5) {
        const lerp = 0.16;
        const stepX = dx * lerp;
        const stepY = dy * lerp;
        this.x += stepX;
        this.y += stepY;
        const stepDist = Math.hypot(stepX, stepY);
        this.distAccum += stepDist;

        /* Walk-cycle frame swap every 8 px walked — tile-step feel */
        if (this.distAccum >= 8) {
          this.distAccum = 0;
          this.setFrame(this.frame === 'walk1' ? 'walk2' : 'walk1');
        } else if (this.frame !== 'walk1' && this.frame !== 'walk2') {
          this.setFrame('walk1');
        }
        this.idleTick = 0;
        this.lastMoveAt = now;
      } else {
        /* Idle: breath cycle + occasional blink + rare head nod */
        const idleSince = now - this.lastMoveAt;
        if (idleSince > 300) {
          this.idleTick += 16;
          if (this.idleTick >= 700) {
            this.idlePhase ^= 1;
            const baseFrame = this.idlePhase ? 'idle2' : 'idle1';
            /* ~12% chance per cycle to blink (140ms) */
            if (Math.random() < 0.12 && now - this.lastBlink > 2400) {
              this.lastBlink = now;
              this.setFrame('blink');
              setTimeout(() => {
                if (this.frame === 'blink') this.setFrame(baseFrame);
              }, 140);
            } else {
              this.setFrame(baseFrame);
            }
            /* ~6% chance per cycle to do a small head nod */
            if (!this.nodStart && Math.random() < 0.06) {
              this.nodStart = now;
            }
            this.idleTick = 0;
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
