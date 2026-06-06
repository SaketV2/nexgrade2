/**
 * script.js — Tutoring Landing Page
 * Covers:
 *   1. Navbar scroll behaviour & active link highlighting
 *   2. Mobile menu toggle
 *   3. Scroll-triggered reveal animations (IntersectionObserver)
 *   4. Contact form validation & submission
 *   5. Stripe frontend checkout integration (with full comments)
 *   6. Back-to-top button
 *   7. Footer year
 */

'use strict';

/* ============================================================
   1. NAVBAR — scroll class & active link highlight
   ============================================================ */

const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-links a');

/**
 * Adds the .scrolled class to the navbar once the user scrolls
 * past 20px — this triggers the border + shadow style in CSS.
 */
function handleNavScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}

/**
 * Highlights the nav link matching the section currently in view.
 * Uses a simple "which section's top is closest above midscreen" check.
 */
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
      link.getAttribute('href') === `#${current}`
    );
  });
}

window.addEventListener('scroll', () => {
  handleNavScroll();
  highlightActiveNavLink();
}, { passive: true });

// Run once on load in case user lands mid-page
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
  // Prevent body scroll while menu is open
  document.body.style.overflow = open ? 'hidden' : '';
}

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.contains('open');
  toggleMenu(!isOpen);
});

// Close menu when any mobile link is clicked
mobileLinks.forEach(link => {
  link.addEventListener('click', () => toggleMenu(false));
});

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
    toggleMenu(false);
    hamburger.focus();
  }
});


/* ============================================================
   3. SCROLL-TRIGGERED REVEAL ANIMATIONS
   ============================================================ */

/**
 * IntersectionObserver approach — performant, no scroll listener needed.
 * Elements with the class .reveal, .fade-in-up, or .fade-in-right start
 * invisible (set in CSS) and become visible when they enter the viewport.
 */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Unobserve after reveal so we don't keep checking
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,      // Trigger when 12% of element is visible
    rootMargin: '0px 0px -40px 0px'  // Slightly early trigger
  }
);

// Observe all animated elements
document.querySelectorAll('.reveal, .fade-in-up, .fade-in-right').forEach(el => {
  revealObserver.observe(el);
});


/* ============================================================
   4. CONTACT FORM — validation & mock submission
   ============================================================ */

const contactForm    = document.getElementById('contactForm');
const formSubmitBtn  = document.getElementById('formSubmitBtn');
const formSuccess    = document.getElementById('formSuccess');

/**
 * Validates a single field and returns true if valid.
 * Shows an inline error message if invalid.
 */
function validateField(field) {
  const errorEl = field.closest('.form-group')?.querySelector('.field-error');
  let errorMsg = '';

  field.classList.remove('error');

  if (field.required && !field.value.trim()) {
    errorMsg = 'This field is required.';
  } else if (field.type === 'email' && field.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value.trim())) {
      errorMsg = 'Please enter a valid email address.';
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

// Live validation on blur
contactForm?.querySelectorAll('input, select, textarea').forEach(field => {
  field.addEventListener('blur', () => validateField(field));
  field.addEventListener('input', () => {
    if (field.classList.contains('error')) validateField(field);
  });
});

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate all fields
  const fields = contactForm.querySelectorAll('input, select, textarea');
  let allValid = true;
  fields.forEach(f => { if (!validateField(f)) allValid = false; });
  if (!allValid) return;

  // Disable button and show loading state
  formSubmitBtn.disabled = true;
  formSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

  /**
   * ─── INTEGRATION POINT ────────────────────────────────────
   * Replace this mock timeout with a real API call.
   *
   * Options:
   *   A) Formspree:  POST to https://formspree.io/f/YOUR_FORM_ID
   *   B) Netlify:    Add data-netlify="true" to the <form> tag
   *   C) EmailJS:    emailjs.send('serviceId', 'templateId', formData)
   *   D) Custom API: fetch('/api/contact', { method:'POST', body: formData })
   *
   * Example with Formspree:
   *
   *   const formData = new FormData(contactForm);
   *   const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
   *     method: 'POST',
   *     headers: { Accept: 'application/json' },
   *     body: formData
   *   });
   *   if (!res.ok) throw new Error('Submission failed');
   * ──────────────────────────────────────────────────────────
   */
  await new Promise(resolve => setTimeout(resolve, 1800)); // Mock delay

  // Show success state
  contactForm.reset();
  formSuccess.hidden = false;
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Reset button
  formSubmitBtn.disabled = false;
  formSubmitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>';
});


/* ============================================================
   5. STRIPE FRONTEND CHECKOUT INTEGRATION
   ============================================================
   HOW THIS WORKS (overview):
   ─────────────────────────
   Stripe Checkout uses a two-step process:
     a) Your server creates a Checkout Session and returns a session ID.
     b) The browser calls stripe.redirectToCheckout({ sessionId }) which
        sends the user to Stripe's hosted payment page.

   This keeps card data completely off your server (PCI-compliant).

   SETUP CHECKLIST:
   ────────────────
   1. Create a Stripe account at https://stripe.com
   2. Find your Publishable Key in the Dashboard → Developers → API keys
   3. Replace STRIPE_PUBLISHABLE_KEY below with your real pk_live_... key
      (use pk_test_... during development)
   4. Create a backend endpoint (e.g. /api/create-checkout-session) that:
      - Accepts { priceAmount, label } in the request body
      - Creates a Stripe Checkout Session server-side using your Secret Key
      - Returns { sessionId: session.id }

   SERVER-SIDE EXAMPLE (Node.js / Express):
   ─────────────────────────────────────────
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

   app.post('/api/create-checkout-session', async (req, res) => {
     const { priceAmount, label } = req.body;
     const session = await stripe.checkout.sessions.create({
       payment_method_types: ['card'],
       line_items: [{
         price_data: {
           currency: 'aud',
           product_data: { name: label },
           unit_amount: priceAmount,          // in cents, e.g. 5500 = $55.00
         },
         quantity: 1,
       }],
       mode: 'payment',
       success_url: `${YOUR_DOMAIN}/success.html`,
       cancel_url:  `${YOUR_DOMAIN}/pricing.html`,
     });
     res.json({ sessionId: session.id });
   });

   DEPLOYING:
   ──────────
   • Vercel: use /api/create-checkout-session.js as a serverless function
   • Netlify: use /.netlify/functions/create-checkout-session
   • Any Node.js server: use express as above
   ============================================================ */

// ── Replace with your real Stripe Publishable Key ──────────────
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_KEY';
// ───────────────────────────────────────────────────────────────

// ── Replace with your actual backend endpoint URL ──────────────
const CHECKOUT_SESSION_ENDPOINT = '/api/create-checkout-session';
// ───────────────────────────────────────────────────────────────

/**
 * Initialises the Stripe client.
 * Stripe.js is loaded in <head> via the official CDN script tag.
 * We only instantiate it if the library loaded successfully.
 */
let stripe = null;

function initStripe() {
  if (typeof Stripe === 'undefined') {
    console.warn('Stripe.js did not load. Check network connectivity.');
    return;
  }
  stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
}

/**
 * Handles a click on any "Book & Pay Now" button.
 * Calls the backend to create a Checkout Session, then
 * redirects the user to Stripe's hosted payment page.
 *
 * @param {string} priceInCents - Amount in AUD cents (e.g. "5500" = $55)
 * @param {string} label        - Product description shown on Stripe checkout
 * @param {HTMLElement} btn     - The button element (for loading state)
 */
async function handleStripeCheckout(priceInCents, label, btn) {
  if (!stripe) {
    alert('Payment system is unavailable. Please contact us directly to book.');
    return;
  }

  // Show loading state on button
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redirecting to payment…';

  try {
    /**
     * Step 1: Ask your server to create a Checkout Session.
     * The server uses the Secret Key (never exposed to the browser)
     * to call the Stripe API and returns a sessionId.
     */
    const response = await fetch(CHECKOUT_SESSION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceAmount: parseInt(priceInCents, 10),
        label: label,
        currency: 'aud',
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const { sessionId } = await response.json();

    /**
     * Step 2: Redirect to Stripe's secure hosted checkout page.
     * This is the ONLY way card data ever flows — directly from
     * the user's browser to Stripe's servers. Your site never
     * touches raw card numbers.
     */
    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      // Stripe's own error (e.g. network issue, invalid session ID)
      console.error('Stripe redirectToCheckout error:', error);
      alert(`Payment error: ${error.message}. Please try again or contact us.`);
    }

  } catch (err) {
    console.error('Checkout session creation failed:', err);
    alert('Could not start checkout. Please contact us directly to book your session.');
  } finally {
    // Always restore button state (unless we successfully redirected)
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// Attach click handlers to all payment buttons
document.querySelectorAll('[data-price]').forEach(btn => {
  btn.addEventListener('click', () => {
    const price = btn.getAttribute('data-price');    // cents, e.g. "5500"
    const label = btn.getAttribute('data-label');    // e.g. "Single Session — 1hr Tutoring"
    handleStripeCheckout(price, label, btn);
  });
});

// Initialise Stripe after DOM is ready
document.addEventListener('DOMContentLoaded', initStripe);


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
   (Handles cases where browser smooth-scroll isn't supported)
   ============================================================ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
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
