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

   SETUP (2 minutes):
   1. Go to https://formspree.io and create a free account
   2. Click "New Form", name it "NexGrade Contact"
   3. Copy your endpoint — it looks like: https://formspree.io/f/xyzabcde
   4. Paste it as the value of FORMSPREE_ENDPOINT below
   5. Deploy — every submission will be emailed to you

   EMAIL VALIDATION SETUP:
   1. Sign up free at https://www.abstractapi.com/api/email-verification-validation-api
   2. Copy your API key and paste it as ABSTRACT_EMAIL_API_KEY below
   3. Free tier = 100 verifications/month (plenty for an enquiry form)
   4. Without the key, validation falls back to DNS-only (no fake gmail detection)

   ============================================================ */

const FORMSPREE_ENDPOINT    = 'https://formspree.io/f/xvznzwvv';
const ABSTRACT_EMAIL_API_KEY = '9ffb1ceccb794323b12405987122c367'; // ← paste your Abstract API key here

const contactForm   = document.getElementById('contactForm');
const formSubmitBtn = document.getElementById('formSubmitBtn');
const formSuccess   = document.getElementById('formSuccess');

// Email format regex — quick structural check before any network call.
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// ─── LAYER 1: DNS MX check ────────────────────────────────────────────────────
// Catches completely made-up domains (e.g. fake@notadomain.xyz).
// Does NOT catch fake accounts on real domains (e.g. fakeperson@gmail.com).
async function domainCanReceiveMail(domain) {
  try {
    const res  = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return true;
    const json = await res.json();
    if (json.Status === 3) return false; // NXDOMAIN — domain doesn't exist
    if (Array.isArray(json.Answer) && json.Answer.length > 0) return true;
    // fallback: check A record
    const ar = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, { headers: { Accept: 'application/json' } });
    const aj = await ar.json();
    return aj.Status !== 3 && Array.isArray(aj.Answer) && aj.Answer.length > 0;
  } catch { return true; } // fail open on network error
}

// ─── LAYER 2: Abstract API SMTP check ────────────────────────────────────────
// Actually pings the mail server to confirm the mailbox exists.
// Catches fake@gmail.com, madeup@hotmail.com, etc.
// Returns: 'valid' | 'invalid' | 'unknown' (unknown = server didn't respond definitively)
async function checkMailboxExists(email) {
  if (!ABSTRACT_EMAIL_API_KEY) return 'unknown'; // key not set — skip
  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_EMAIL_API_KEY}&email=${encodeURIComponent(email)}`;
    const res  = await fetch(url);
    if (!res.ok) return 'unknown';
    const json = await res.json();
    // deliverability: "DELIVERABLE" | "UNDELIVERABLE" | "UNKNOWN"
    if (json.deliverability === 'UNDELIVERABLE') return 'invalid';
    if (json.deliverability === 'DELIVERABLE')   return 'valid';
    return 'unknown';
  } catch { return 'unknown'; } // fail open on network error
}

// ─── SYNC: non-email fields ───────────────────────────────────────────────────
function validateField(field) {
  const errorEl = field.closest('.form-group')?.querySelector('.field-error');
  field.classList.remove('error');
  if (field.required && !field.value.trim()) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = 'This field is required.';
    return false;
  }
  if (errorEl) errorEl.textContent = '';
  return true;
}

// ─── ASYNC: email field (format → DNS → SMTP) ────────────────────────────────
async function validateEmailField(field) {
  const errorEl  = field.closest('.form-group')?.querySelector('.field-error');
  const emailVal = field.value.trim().toLowerCase();

  field.classList.remove('error');
  if (errorEl) { errorEl.textContent = ''; errorEl.style.color = ''; }

  if (!emailVal) {
    if (field.required) {
      field.classList.add('error');
      if (errorEl) errorEl.textContent = 'This field is required.';
      return false;
    }
    return true;
  }

  // Step 1 — format
  if (!EMAIL_REGEX.test(emailVal)) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = 'This email address is invalid.';
    return false;
  }

  const domain = emailVal.split('@')[1] || '';

  // Show neutral "checking" state while network calls run
  if (errorEl) { errorEl.textContent = 'Checking email…'; errorEl.style.color = 'var(--clr-text-muted, #888)'; }

  // Step 2 — DNS MX
  const domainOk = await domainCanReceiveMail(domain);
  if (!domainOk) {
    field.classList.add('error');
    if (errorEl) { errorEl.style.color = ''; errorEl.textContent = 'This email address is invalid.'; }
    return false;
  }

  // Step 3 — SMTP mailbox check (requires Abstract API key)
  const mailboxStatus = await checkMailboxExists(emailVal);
  if (errorEl) { errorEl.style.color = ''; errorEl.textContent = ''; }

  if (mailboxStatus === 'invalid') {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = 'This email address is invalid.';
    return false;
  }

  // 'valid' or 'unknown' (server didn't confirm either way) — allow through
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

    // Success
    contactForm.reset();
    formSuccess.hidden = false;
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Reset button
    formSubmitBtn.disabled = false;
    formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';

  } catch (err) {
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
