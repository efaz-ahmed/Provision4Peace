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

  // ---------- Email draft ----------
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const membership = reasonSelect.value === 'membership';
      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const lines = [`Full name: ${name}`, `Email address: ${email}`];
      let subject;

      if (membership) {
        subject = 'Membership fund plan application';
        lines.push(
          `Date of birth: ${document.getElementById('membership-dob').value}`,
          `Preferred plan: ${document.getElementById('membership-plan').value}`,
          `Full address: ${document.getElementById('membership-address').value.trim()}`,
          '',
          'Please attach proof of ID and proof of address to this email before sending. Proof of address must be dated within the past 3 months.'
        );
      } else {
        subject = 'General enquiry';
        lines.push(
          `Phone number: ${document.getElementById('contact-phone').value.trim()}`,
          `Preferred contact method: ${document.querySelector('input[name="ContactMethod"]:checked').value}`,
          '',
          document.getElementById('contact-message').value.trim()
        );
      }

      const body = lines.join('\r\n');
      const draft = `mailto:Info@provision4peace.org.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const draftLink = document.getElementById('contact-email-draft');
      const status = document.getElementById('contact-email-status');
      const copy = document.getElementById('contact-email-copy');
      draftLink.href = draft;
      draftLink.hidden = false;
      status.hidden = false;
      copy.value = `To: Info@provision4peace.org.uk\r\nSubject: ${subject}\r\n\r\n${body}`;
      copy.hidden = false;
      window.location.href = draft;
    });
  }

})();
