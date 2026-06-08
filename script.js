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

// Bug fix #1: Stricter email regex + disposable-domain blocklist.
// Old regex (/^[^\s@]+@[^\s@]+\.[^\s@]+$/) passes fake@fake.com, test@test.com, etc.
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com',
  'throwam.com','yopmail.com','trashmail.com','fakeinbox.com','sharklasers.com',
  'guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.biz',
  'guerrillamail.de','guerrillamail.net','guerrillamail.org','spam4.me',
  'trashmail.at','trashmail.io','trashmail.me','trashmail.net','dispostable.com',
  'mailnull.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'fake.com','fake.net','fake.org','example.com','example.net','example.org',
  'test.com','test.net','test.org','invalid.com','nowhere.com','noemail.com',
]);

function validateField(field) {
  const errorEl = field.closest('.form-group')?.querySelector('.field-error');
  let errorMsg = '';

  field.classList.remove('error');

  if (field.required && !field.value.trim()) {
    errorMsg = 'This field is required.';
  } else if (field.type === 'email' && field.value.trim()) {
    const emailVal = field.value.trim().toLowerCase();
    const domain   = emailVal.split('@')[1] || '';
    if (!EMAIL_REGEX.test(emailVal)) {
      errorMsg = 'Please enter a valid email address.';
    } else if (DISPOSABLE_DOMAINS.has(domain)) {
      errorMsg = 'Please use a real email address — temporary inboxes are not accepted.';
    }
  }

  if (errorMsg) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = errorMsg;
    return false;
  }

  if (errorEl) errorEl.textContent = '';
  return true;
}

// Live validation on blur, re-validate on input if field was already invalid
contactForm?.querySelectorAll('input, select, textarea').forEach(field => {
  field.addEventListener('blur', () => validateField(field));
  field.addEventListener('input', () => {
    if (field.classList.contains('error')) validateField(field);
  });
});

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate all fields first
  const fields = contactForm.querySelectorAll('input, select, textarea');
  let allValid = true;
  fields.forEach(f => { if (!validateField(f)) allValid = false; });
  if (!allValid) return;

  // Bug fix #2: hide any previously-shown success banner before the new request goes out.
  // Without this, the green banner stays visible the entire time the new fetch is in-flight.
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
