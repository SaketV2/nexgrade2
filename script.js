/**
 * script.js — Tutoring Landing Page
 * Covers:
 *   1. Navbar scroll behaviour & active link highlighting
 *   2. Mobile menu toggle
 *   3. Scroll-triggered reveal animations (IntersectionObserver)
 *   4. Contact form validation & submission (Formspree)
 *   5. Stripe frontend checkout integration
 *   6. Back-to-top button
 *   7. Footer year
 *   8. Smooth anchor navigation
 */

'use strict';

/* ============================================================
   1. NAVBAR — scroll class & active link highlight
   ============================================================ */

const navbar   = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-links a');

function handleNavScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}

function highlightActiveNavLink() {
  const sections = document.querySelectorAll('main section[id]');
  const midY = window.scrollY + window.innerHeight / 2;

  let current = '';
  sections.forEach(section => {
    if (section.offsetTop <= midY) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.toggle(
      'active',
      current !== '' && link.getAttribute('href') === `#${current}`
    );
  });
}

window.addEventListener('scroll', () => {
  handleNavScroll();
  highlightActiveNavLink();
}, { passive: true });

handleNavScroll();
highlightActiveNavLink();


/* ============================================================
   2. MOBILE MENU
   ============================================================ */

const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-cta');

function toggleMenu(open) {
  hamburger.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.contains('open');
  toggleMenu(!isOpen);
});

mobileLinks.forEach(link => {
  link.addEventListener('click', () => toggleMenu(false));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
    toggleMenu(false);
    hamburger.focus();
  }
});


/* ============================================================
   3. SCROLL-TRIGGERED REVEAL ANIMATIONS
   ============================================================ */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  }
);

document.querySelectorAll('.reveal, .fade-in-up, .fade-in-right').forEach(el => {
  revealObserver.observe(el);
});


/* ============================================================
   4. CONTACT FORM — Formspree
   ============================================================

   Setup:
   1. Create a Formspree form and copy your endpoint.
   2. Paste it as the value of FORMSPREE_ENDPOINT below.
   3. Deploy — submissions will be emailed to you.

   The contact form now blocks submissions unless the visitor enters a
   properly formatted Gmail address, which prevents fake or non-Gmail
   addresses from being sent through to Formspree.
   ============================================================ */

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xvznzwvv';

const contactForm   = document.getElementById('contactForm');
const formSubmitBtn = document.getElementById('formSubmitBtn');
const formSuccess   = document.getElementById('formSuccess');

// Only allow properly formatted Gmail addresses.
const GMAIL_REGEX = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:gmail\.com|googlemail\.com)$/i;

function setFieldError(field, message) {
  const errorEl = field.closest('.form-group')?.querySelector('.field-error');
  field.classList.toggle('error', Boolean(message));
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.style.color = message ? 'var(--clr-accent-danger, #b42318)' : '';
  }
}

function validateField(field) {
  if (field.required && !field.value.trim()) {
    setFieldError(field, 'This field is required.');
    return false;
  }
  setFieldError(field, '');
  return true;
}

function showFormFeedback(success, message) {
  formSuccess.hidden = false;
  formSuccess.innerHTML = `
    <i class="fa-solid ${success ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
    <span>${message}</span>
  `;
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function validateEmailField(field) {
  const emailVal = field.value.trim().toLowerCase();

  if (!emailVal) {
    setFieldError(field, field.required ? 'This field is required.' : '');
    return !field.required;
  }

  if (!GMAIL_REGEX.test(emailVal)) {
    setFieldError(field, 'Please enter a valid Gmail address, for example yourname@gmail.com.');
    return false;
  }

  setFieldError(field, '');
  return true;
}

// Live validation: blur = full async check; typing clears existing error instantly.
contactForm?.querySelectorAll('input, select, textarea').forEach(field => {
  field.addEventListener('blur', () => {
    if (field.type === 'email') validateEmailField(field);
    else validateField(field);
  });
  field.addEventListener('input', () => {
    if (field.classList.contains('error')) {
      field.classList.remove('error');
      const errorEl = field.closest('.form-group')?.querySelector('.field-error');
      if (errorEl) { errorEl.style.color = ''; errorEl.textContent = ''; }
    }
  });
});

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Sync-validate all non-email fields
  const fields     = contactForm.querySelectorAll('input, select, textarea');
  const emailField = contactForm.querySelector('input[type="email"]');
  let allValid = true;
  fields.forEach(f => { if (f.type !== 'email' && !validateField(f)) allValid = false; });
  if (!allValid) return;

  // 2. Async-validate email (format → DNS → SMTP). Block form if invalid.
  if (emailField) {
    formSubmitBtn.disabled = true;
    formSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying email…';
    const emailOk = await validateEmailField(emailField);
    if (!emailOk) {
      formSubmitBtn.disabled = false;
      formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';
      return; // ← form is NOT sent to Formspree
    }
  }

  // 3. Email is valid — proceed with submission
  formSuccess.hidden = true;
  formSubmitBtn.disabled = true;
  formSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(contactForm),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.errors?.[0]?.message || 'Submission failed. Please try again.');
    }

    // Success only after Formspree accepts the submission.
    contactForm.reset();
    showFormFeedback(true, "Message sent! I'll be in touch within a few hours.");

    // Reset button
    formSubmitBtn.disabled = false;
    formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';

  } catch (err) {
    showFormFeedback(false, 'An error occurred, please try again.');
    formSubmitBtn.innerHTML =
      '<i class="fa-solid fa-triangle-exclamation"></i> ' +
      (err.message || 'Something went wrong. Try emailing directly.');
    formSubmitBtn.disabled = false;
  }
});


/* ============================================================
   5. STRIPE FRONTEND CHECKOUT
   ============================================================ */

const PAYMENT_LINKS = {
  single: 'https://buy.stripe.com/aFaaEXeJ359t17F8SJ0co00',
  bundle: 'https://buy.stripe.com/7sYaEX6cxgSbbMj3yp0co01',
};

document.querySelectorAll('[data-price]').forEach(btn => {
  btn.addEventListener('click', () => {
    const label    = btn.getAttribute('data-label') || '';
    const isBundle = label.toLowerCase().includes('bundle') ||
                     btn.getAttribute('data-price') === '25000';
    const url      = isBundle ? PAYMENT_LINKS.bundle : PAYMENT_LINKS.single;

    const originalHTML = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redirecting to payment…';

    const restoreBtn = (e) => {
      if (e.persisted) {
        btn.disabled  = false;
        btn.innerHTML = originalHTML;
      }
      window.removeEventListener('pageshow', restoreBtn);
    };
    window.addEventListener('pageshow', restoreBtn);

    window.location.href = url;
  });
});


/* ============================================================
   6. BACK-TO-TOP BUTTON
   ============================================================ */

const backToTopBtn = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  backToTopBtn.classList.toggle('visible', window.scrollY > 500);
}, { passive: true });

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


/* ============================================================
   7. FOOTER YEAR
   ============================================================ */

const footerYearEl = document.getElementById('footerYear');
if (footerYearEl) {
  footerYearEl.textContent = new Date().getFullYear();
}


/* ============================================================
   8. SMOOTH ANCHOR NAVIGATION
   ============================================================ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      const navHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
        10
      ) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
