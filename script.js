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

const heroScrollHint = document.querySelector('.hero-scroll-hint');

window.addEventListener('scroll', () => {
  handleNavScroll();
  highlightActiveNavLink();

  if (heroScrollHint) {
    heroScrollHint.hidden = window.scrollY > 100;
  }
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
  formSuccess.classList.remove('success', 'error');
  formSuccess.classList.add(success ? 'success' : 'error');
  formSuccess.innerHTML = `
    <i class="fa-solid ${success ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
    <span>${message}</span>
  `;
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function verifyGmailDeliverability(email) {
  const apiUrl = `https://open.kickbox.com/v1/verify?email=${encodeURIComponent(email)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();

    if (data?.result === 'deliverable' || data?.deliverable === true) {
      return true;
    }
    return false;
  } catch (error) {
    return null;
  }
}

async function validateEmailField(field) {
  const emailVal = field.value.trim().toLowerCase();

  if (!emailVal) {
    setFieldError(field, field.required ? 'This field is required.' : '');
    return false;
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
      return;
    }

    const deliveryOk = await verifyGmailDeliverability(emailField.value.trim().toLowerCase());
    if (deliveryOk === false) {
      setFieldError(emailField, 'This Gmail address does not appear to be deliverable. Please use a real Gmail address.');
      formSubmitBtn.disabled = false;
      formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';
      return;
    }

    if (deliveryOk === null) {
      setFieldError(emailField, 'Unable to verify this Gmail address right now. Please check your email or try again later.');
      formSubmitBtn.disabled = false;
      formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';
      return;
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
  online: 'https://buy.stripe.com/5kQ00j8kFdFZcQn8SJ0co02',
};

document.querySelectorAll('[data-price]').forEach(btn => {
  btn.addEventListener('click', () => {
    const label    = btn.getAttribute('data-label') || '';
    const isBundle = label.toLowerCase().includes('bundle') ||
                     btn.getAttribute('data-price') === '25000';
    const isOnline = label.toLowerCase().includes('online') ||
                     btn.getAttribute('data-price') === '4000';
    const url      = isBundle ? PAYMENT_LINKS.bundle : isOnline ? PAYMENT_LINKS.online : PAYMENT_LINKS.single;

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

const authButtons = document.querySelectorAll('.auth-provider-btn');
const authPanel = document.querySelector('.auth-panel');
const accountSummary = document.querySelector('.account-summary');
const accountTitle = document.getElementById('accountTitle');
const accountMessage = document.getElementById('accountMessage');
const portalBtn = document.getElementById('portalBtn');
let stripeCustomerId = null;

async function fetchCustomerStatus(email) {
  if (!email) {
    throw new Error('Verified Google email not found');
  }

  if (authPanel) authPanel.hidden = true;
  if (accountSummary) accountSummary.hidden = false;
  if (accountTitle) accountTitle.textContent = 'Checking your Stripe subscription…';
  if (accountMessage) accountMessage.textContent = 'Retrieving your verified Stripe customer profile using your Google email.';
  if (portalBtn) portalBtn.disabled = true;

  const response = await fetch('/api/get-customer-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to retrieve customer status');
  }

  stripeCustomerId = data.customerId;
  const hasActiveSubscription = Boolean(data.hasActiveSubscription);
  const subscriptionDetails = Array.isArray(data.subscriptionDetails) ? data.subscriptionDetails : [];

  if (hasActiveSubscription && subscriptionDetails.length > 0) {
    const details = subscriptionDetails.map(item => {
      const nextBilling = item.nextBillingDate ? `Next billing: ${item.nextBillingDate}` : 'Next billing date unavailable';
      return `
        <strong>${item.productName}</strong><br />
        ${item.tier}<br />
        ${nextBilling}
      `;
    }).join('<br /><br />');

    if (accountTitle) accountTitle.textContent = 'Active subscription found';
    if (accountMessage) accountMessage.innerHTML = `You have an active tutoring subscription.<br /><br />${details}`;
  } else {
    if (accountTitle) accountTitle.textContent = 'No active subscription';
    if (accountMessage) accountMessage.textContent = 'We did not find an active Stripe subscription for your account. You can open the customer portal to manage billing or visit pricing to choose a plan.';
  }

  if (portalBtn) portalBtn.disabled = false;
}

if (authButtons.length) {
  authButtons.forEach(button => {
    button.addEventListener('click', () => {
      const provider = button.dataset.provider;
      window.location.href = `/api/auth-${provider}`;
    });
  });
}

if (portalBtn) {
  portalBtn.addEventListener('click', async () => {
    if (!stripeCustomerId) {
      alert('Unable to open the portal until your Stripe customer account has been loaded. Please refresh and try again.');
      return;
    }

    portalBtn.disabled = true;
    portalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening portal…';

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Unable to open portal');
      }

      window.location.href = data.url;
    } catch (error) {
      portalBtn.disabled = false;
      portalBtn.innerHTML = 'Open Customer Portal';
      alert(error.message || 'Could not open customer portal at this time.');
    }
  });
}

const urlParams = new URLSearchParams(window.location.search);
const authParam = urlParams.get('auth');
const emailParam = urlParams.get('email');

if (authParam === 'google' && emailParam) {
  fetchCustomerStatus(emailParam).catch(error => {
    if (accountTitle) accountTitle.textContent = 'Unable to load account';
    if (accountMessage) accountMessage.textContent = error.message || 'There was an issue retrieving your Stripe subscription status.';
    if (accountSummary) accountSummary.hidden = false;
    if (authPanel) authPanel.hidden = true;
    if (portalBtn) portalBtn.disabled = false;
    console.error('Customer status load failed:', error);
  });
} else if (authParam) {
  if (authPanel) authPanel.hidden = true;
  if (accountSummary) accountSummary.hidden = false;
  if (accountTitle) accountTitle.textContent = 'Signed in';
  if (accountMessage) accountMessage.textContent = 'Your login has been detected. If you do not see your email, please sign in again.';
}


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
