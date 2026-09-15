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

  // ---------- Contact form enquiry type ----------
  const reasonSelect = document.getElementById('contact-reason');
  const membershipFields = document.getElementById('membership-enquiry-fields');
  const generalFields = document.getElementById('general-enquiry-fields');

  if (reasonSelect && membershipFields && generalFields) {
    const setSectionState = (section, visible) => {
      section.hidden = !visible;
      section.querySelectorAll('input, select, textarea').forEach((field) => {
        field.disabled = !visible;
        field.required = visible && field.dataset.requiredWhenVisible === 'true';
      });
    };

    const updateEnquiryFields = () => {
      setSectionState(membershipFields, reasonSelect.value === 'membership');
      setSectionState(generalFields, reasonSelect.value === 'general');
    };

    reasonSelect.addEventListener('change', updateEnquiryFields);
    updateEnquiryFields();
  }

})();
