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
  let updateEnquiryFields = () => {};

  if (reasonSelect && membershipFields && generalFields) {
    const setSectionState = (section, visible) => {
      section.hidden = !visible;
      section.querySelectorAll('input, select, textarea').forEach((field) => {
        field.disabled = !visible;
        field.required = visible && field.dataset.requiredWhenVisible === 'true';
      });
    };

    updateEnquiryFields = () => {
      setSectionState(membershipFields, reasonSelect.value === 'membership');
      setSectionState(generalFields, reasonSelect.value === 'general');
    };

    reasonSelect.addEventListener('change', updateEnquiryFields);
    updateEnquiryFields();
  }

  // ---------- Contact form submission ----------
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const membership = reasonSelect.value === 'membership';
      const value = (id) => document.getElementById(id).value.trim();
      const payload = {
        reason: reasonSelect.value,
        fullName: value('contact-name'),
        email: value('contact-email'),
        phone: value('contact-phone'),
        _honey: value('contact-company'),
      };

      if (membership) {
        payload.dateOfBirth = value('membership-dob');
        payload.plan = value('membership-plan');
        payload.address = value('membership-address');
        payload.nominee = {
          name: value('nominee-name'),
          dateOfBirth: value('nominee-dob'),
          address: value('nominee-address'),
          phone: value('nominee-phone'),
          email: value('nominee-email'),
          relationship: value('nominee-relationship'),
        };
      } else {
        const contactMethod = document.querySelector('input[name="contactMethod"]:checked');
        payload.contactMethod = contactMethod ? contactMethod.value : '';
        payload.message = value('contact-message');
      }

      const status = document.getElementById('contact-form-status');
      const submitButton = document.getElementById('contact-form-submit');
      status.hidden = false;
      status.textContent = 'Sending your enquiry…';
      submitButton.disabled = true;

      try {
        const response = await window.fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || result.success !== true) {
          throw new Error(result.message || 'Please try again.');
        }

        contactForm.reset();
        updateEnquiryFields();
        status.textContent = 'Your enquiry has been sent successfully. We will be in touch.';
        submitButton.textContent = 'Enquiry sent';
      } catch (error) {
        status.textContent = error && error.message
          ? `We couldn’t send your enquiry: ${error.message}`
          : 'We couldn’t send your enquiry. Please try again or contact us by phone.';
        submitButton.disabled = false;
      }
    });
  }

})();
