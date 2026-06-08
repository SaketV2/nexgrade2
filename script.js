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
    // Bug fix #6: when current is '' (scrolled above all sections),
    // toggle(false) now explicitly removes .active instead of leaving it set.
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

   ============================================================ */

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xvznzwvv';

const contactForm   = document.getElementById('contactForm');
const formSubmitBtn = document.getElementById('formSubmitBtn');
const formSuccess   = document.getElementById('formSuccess');

// Email format regex — checks structural validity before doing any network call.
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// DNS MX record check via Google DNS-over-HTTPS.
// Returns true if the domain has real mail servers registered in DNS,
// false if the domain doesn't exist or has no MX records.
// Fails open (returns true) on network errors so bad connectivity doesn't block real users.
async function domainCanReceiveMail(domain) {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return true; // fail open on HTTP error
    const json = await res.json();

    // Status 3 = NXDOMAIN — this domain does not exist at all
    if (json.Status === 3) return false;

    // If there are MX records, the domain definitely accepts mail
    if (Array.isArray(json.Answer) && json.Answer.length > 0) return true;

    // No MX records — fall back to checking for an A record.
    // Some small domains rely on their A record for mail delivery (rare but valid).
    const aRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: 'application/json' } }
    );
    if (!aRes.ok) return true;
    const aJson = await aRes.json();
    return aJson.Status !== 3 && Array.isArray(aJson.Answer) && aJson.Answer.length > 0;
  } catch {
    return true; // fail open on network/CORS error
  }
}

// Sync validation for all non-email fields.
function validateField(field) {
  const errorEl = field.closest('.form-group')?.querySelector('.field-error');
  let errorMsg = '';

  field.classList.remove('error');

  if (field.required && !field.value.trim()) {
    errorMsg = 'This field is required.';
  }

  if (errorMsg) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = errorMsg;
    return false;
  }

  if (errorEl) errorEl.textContent = '';
  return true;
}

// Async validation for the email field.
// Step 1: format check (instant).
// Step 2: DNS MX lookup to confirm the domain actually exists and can receive mail.
async function validateEmailField(field) {
  const errorEl  = field.closest('.form-group')?.querySelector('.field-error');
  const emailVal = field.value.trim().toLowerCase();

  field.classList.remove('error');
  if (errorEl) errorEl.textContent = '';

  // Empty + required handled by validateField; here we only validate if there's a value.
  if (!emailVal) {
    if (field.required) {
      field.classList.add('error');
      if (errorEl) errorEl.textContent = 'This field is required.';
      return false;
    }
    return true;
  }

  // Step 1 — format check
  if (!EMAIL_REGEX.test(emailVal)) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
    return false;
  }

  const domain = emailVal.split('@')[1] || '';

  // Step 2 — DNS MX check: show a neutral "Checking…" hint while the lookup runs
  if (errorEl) {
    errorEl.textContent = 'Checking email…';
    errorEl.style.color = 'var(--clr-text-muted, #888)';
  }

  const real = await domainCanReceiveMail(domain);

  if (errorEl) errorEl.style.color = '';

  if (!real) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
    return false;
  }

  if (errorEl) errorEl.textContent = '';
  return true;
}

// Live validation — blur triggers async email check; input clears errors while typing.
contactForm?.querySelectorAll('input, select, textarea').forEach(field => {
  field.addEventListener('blur', () => {
    if (field.type === 'email') {
      validateEmailField(field); // async — intentionally not awaited; updates UI when done
    } else {
      validateField(field);
    }
  });
  field.addEventListener('input', () => {
    if (field.classList.contains('error')) {
      // Clear the error immediately while the user types so they get instant feedback
      field.classList.remove('error');
      const errorEl = field.closest('.form-group')?.querySelector('.field-error');
      if (errorEl) { errorEl.style.color = ''; errorEl.textContent = ''; }
    }
  });
});

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Validate all non-email fields synchronously
  const fields    = contactForm.querySelectorAll('input, select, textarea');
  const emailField = contactForm.querySelector('input[type="email"]');
  let allValid = true;
  fields.forEach(f => {
    if (f.type !== 'email' && !validateField(f)) allValid = false;
  });
  if (!allValid) return;

  // 2. Validate the email field asynchronously (DNS MX check)
  if (emailField) {
    formSubmitBtn.disabled = true;
    formSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying email…';
    const emailOk = await validateEmailField(emailField);
    if (!emailOk) {
      formSubmitBtn.disabled = false;
      formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';
      return;
    }
  }

  // 3. Hide any previously-shown success banner before sending
  formSuccess.hidden = true;

  // Show loading state
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
    // Show the error message on the button so the user knows something went wrong
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

    // Bug fix #5: the old setTimeout ran 4 s after navigation away — the page is
    // already unloaded by then so it never fired. Use pageshow instead, which fires
    // when the browser restores the page from the bfcache after the user hits Back.
    const restoreBtn = (e) => {
      if (e.persisted) {          // bfcache restore (back-navigation)
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
