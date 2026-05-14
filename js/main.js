/* ============================================================
   Provision4Peace — main.js
   Mobile drawer toggle, sticky-compact header
   ============================================================ */

(function () {
  'use strict';

  // ---------- Mobile drawer ----------
  const toggle  = document.getElementById('nav-toggle');
  const drawer  = document.getElementById('site-drawer');

  if (toggle && drawer) {
    const setOpen = (open) => {
      toggle.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
      const isOpen = toggle.classList.contains('is-open');
      setOpen(!isOpen);
    });

    // Close drawer when any link inside is clicked
    drawer.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.classList.contains('is-open')) {
        setOpen(false);
      }
    });
  }

  // ---------- Sticky compact header ----------
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-compact', window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initialise
  }

  // ---------- Footer copyright year (auto-update) ----------
  const yearEl = document.getElementById('copy-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
