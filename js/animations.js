/* ============================================================
   Provision4Peace — animations.js
   GSAP + ScrollTrigger: hero stagger, scroll reveals, marquee
   ============================================================ */

(function () {
  'use strict';

  // ---------- Guards ----------
  // GSAP must be loaded — it's via CDN with `defer` ahead of this file.
  if (typeof gsap === 'undefined') {
    console.warn('[P4P] GSAP not loaded — content remains visible, no animation.');
    return;
  }

  // Respect reduced motion — show everything in its final state, skip timelines.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Nothing to do — CSS leaves elements visible by default.
    return;
  }

  // Register ScrollTrigger if available
  const hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ---------- 1. Hero word stagger ----------
  const heroWords = document.querySelectorAll('.hero__headline .word');
  if (heroWords.length) {
    gsap.from(heroWords, {
      yPercent: 60,
      opacity: 0,
      duration: 0.9,
      stagger: 0.12,
      delay: 0.2,
      ease: 'power2.out',
    });
  }

  // ---------- 2. Hero supporting elements ----------
  const heroSupport = document.querySelectorAll(
    '.hero__eyebrow, .hero__rule, .hero__body, .hero__ctas'
  );
  if (heroSupport.length) {
    gsap.from(heroSupport, {
      y: 16,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      delay: 0.8,
      ease: 'power2.out',
    });
  }

  // ---------- 3. Scroll reveals (ScrollTrigger) ----------
  if (hasScrollTrigger) {
    gsap.utils.toArray('.reveal').forEach((el) => {
      gsap.from(el, {
        y: 16,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
          toggleActions: 'play none none none',
        },
      });
    });
  } else {
    // ScrollTrigger plugin missing — just show .reveal items as-is.
    // (CSS already keeps them visible; nothing to do.)
  }

  // ---------- 4. Theme strip marquee ----------
  const marqueeTrack = document.querySelector('.theme-strip__track');
  if (marqueeTrack) {
    const marqueeTween = gsap.to(marqueeTrack, {
      xPercent: -50,
      duration: 40,
      repeat: -1,
      ease: 'none',
    });

    // Pause on hover, resume on leave
    const strip = document.querySelector('.theme-strip');
    if (strip) {
      strip.addEventListener('mouseenter', () => marqueeTween.pause());
      strip.addEventListener('mouseleave', () => marqueeTween.resume());
    }

    // Slow the marquee down on mobile (matches the spec's responsive rule)
    const mql = window.matchMedia('(max-width: 639px)');
    const setMarqueeDuration = () => {
      marqueeTween.timeScale(mql.matches ? 40 / 60 : 1); // 60s on mobile, 40s on desktop
    };
    setMarqueeDuration();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', setMarqueeDuration);
    } else if (typeof mql.addListener === 'function') {
      // Safari < 14 fallback
      mql.addListener(setMarqueeDuration);
    }
  }
})();
