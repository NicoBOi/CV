/* ============================================================
   nicolassempere.com — refonte
   - Lenis smooth scroll
   - GSAP/ScrollTrigger : reveals, theme swap
   - Pixel pet : scroll-tracked companion (idle/walk/wave)
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

  /* ---------- Pixel pet ---------- */
  const pet = document.querySelector('[data-pet]');
  let petFrame = 0;
  let petIdleTimer = null;
  let petScrollTimer = null;
  let petWaveLockUntil = 0;

  function setPetState(state) {
    if (!pet) return;
    if (performance.now() < petWaveLockUntil && state !== 'wave') return;
    pet.dataset.petState = state;
  }
  function flipPetFrame() {
    if (!pet) return;
    petFrame = petFrame === 0 ? 1 : 0;
    pet.dataset.petFrame = String(petFrame);
  }
  function petWave() {
    if (!pet) return;
    petWaveLockUntil = performance.now() + 700;
    pet.dataset.petState = 'wave';
    setTimeout(() => {
      if (performance.now() >= petWaveLockUntil - 10) {
        pet.dataset.petState = 'idle';
      }
    }, 700);
  }
  function updatePetPosition() {
    if (!pet) return;
    const h = document.documentElement;
    const max = h.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
    /* From 18vh to 78vh — 60vh of vertical travel */
    const top = 18 + p * 60;
    pet.style.top = top + 'vh';
  }
  if (pet) {
    /* Idle/walk frame swap loop */
    setInterval(() => {
      const state = pet.dataset.petState;
      if (state === 'idle') flipPetFrame();
      else if (state === 'walk' && performance.now() % 200 < 100) flipPetFrame();
    }, 320);
    /* Walk → idle when scroll stops */
    setInterval(() => {
      if (pet.dataset.petState === 'walk' && Date.now() - lastScrollMs > 280) {
        setPetState('idle');
      }
    }, 100);
  }

  /* ---------- Scroll listener ---------- */
  let lastScrollMs = 0;
  function onScroll() {
    lastScrollMs = Date.now();
    updateProgress();
    updatePetPosition();
    if (pet && pet.dataset.petState !== 'wave') setPetState('walk');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updatePetPosition, { passive: true });

  /* ---------- Bail out cleanly if libs not available ---------- */
  const hasGSAP  = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  if (reduced || !hasGSAP) {
    /* Static reveals */
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
    setupThemeFallback();
    return;
  }

  /* ---------- Lenis smooth scroll ---------- */
  if (hasLenis && !reduced) {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', () => { ScrollTrigger.update(); onScroll(); });
  }

  /* ---------- GSAP setup ---------- */
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

  /* Pet wave on important landmarks */
  if (pet) {
    const landmarks = [
      ...gsap.utils.toArray('.section h2, .pitch__lede, .production__quote, .closer'),
    ];
    landmarks.forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 60%',
        onEnter: () => petWave(),
      });
    });
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
