/* =============================================
   script.js — Reyman Casio Portfolio
   ============================================= */

const NAV_HEIGHT = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
const SCROLL_GAP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--scroll-gap')) || 24;

// ── NAV SCROLL STATE
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── HAMBURGER MENU
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
});

// ── SMOOTH NAV CLICK WITH CORRECT OFFSET
// CSS scroll-margin-top handles it, but we also intercept
// clicks so we can close the mobile menu and guarantee
// the exact offset even if CSS scroll-margin isn't supported.
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href.startsWith('#')) return;
    e.preventDefault();

    navLinks.classList.remove('open'); // close mobile menu
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', false);

    const target = document.querySelector(href);
    if (!target) return;

    const navH  = nav.offsetHeight;
    const gap   = 8;
    const top   = target.getBoundingClientRect().top + window.scrollY - navH - gap;

    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });
});

// Close mobile menu if user clicks outside
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target)) {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', false);
  }
});

// ── ACTIVE NAV HIGHLIGHT
const sections    = document.querySelectorAll('section[id]');
const navLinkEls  = document.querySelectorAll('.nav-link');

function updateActiveNav() {
  const scrollY = window.scrollY;
  let current   = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - nav.offsetHeight - 40;
    if (scrollY >= top) current = sec.getAttribute('id');
  });
  navLinkEls.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}
window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

// ── REVEAL ON SCROLL
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
revealEls.forEach(el => revealObs.observe(el));

// ── PARTICLES
(function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    p.style.cssText = [
      `position:absolute`,
      `width:${size}px`,
      `height:${size}px`,
      `border-radius:50%`,
      `background:rgba(29,233,182,${(Math.random() * 0.35 + 0.08).toFixed(2)})`,
      `left:${(Math.random() * 100).toFixed(1)}%`,
      `top:${(Math.random() * 100).toFixed(1)}%`,
      `animation:fp ${(Math.random() * 8 + 6).toFixed(1)}s ease-in-out infinite`,
      `animation-delay:${(Math.random() * -10).toFixed(1)}s`,
    ].join(';');
    container.appendChild(p);
  }

  // Inject keyframes once
  if (!document.getElementById('particle-kf')) {
    const s = document.createElement('style');
    s.id = 'particle-kf';
    s.textContent = `
      @keyframes fp {
        0%,100% { transform: translate(0,0) scale(1); opacity:0.3; }
        25%      { transform: translate(14px,-18px) scale(1.2); opacity:0.8; }
        50%      { transform: translate(-8px,12px) scale(0.85); opacity:0.5; }
        75%      { transform: translate(-14px,-8px) scale(1.1); opacity:0.65; }
      }
    `;
    document.head.appendChild(s);
  }
})();

// ── COUNTER ANIMATION for stat numbers
function animateCounter(el) {
  const raw    = el.getAttribute('data-target');
  const suffix = el.getAttribute('data-suffix') || '';
  const target = parseFloat(raw);
  if (isNaN(target)) return;

  const duration = 1400;
  const start    = performance.now();

  function tick(now) {
    const p  = Math.min((now - start) / duration, 1);
    const e  = 1 - Math.pow(1 - p, 3);       // ease-out cubic
    el.textContent = Math.round(e * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.6 });
document.querySelectorAll('.stat__num[data-target]').forEach(el => counterObs.observe(el));

// ── CONTACT FORM — Bot protection + Google Sheets via Apps Script proxy
(function initContactForm() {
  const form      = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn    = document.getElementById('formSubmitBtn');
  const btnText      = document.getElementById('formBtnText');
  const countdown    = document.getElementById('formCountdown');
  const errorBox     = document.getElementById('formError');

  // ── 1. Countdown timer before enabling submit (10–15s, randomised)
  const DELAY = Math.floor(Math.random() * 6) + 10; // 10–15 seconds
  let remaining = DELAY;
  countdown.textContent = remaining;

  const timer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timer);
      submitBtn.disabled = false;
      btnText.textContent = 'Send Message';
    } else {
      countdown.textContent = remaining;
    }
  }, 1000);

  // ── 2. Email format validation helper
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
  function clearError() {
    errorBox.textContent = '';
    errorBox.style.display = 'none';
  }

  // ── 3. Google Apps Script Web App URL
  // IMPORTANT: Replace the value below with YOUR deployed Apps Script Web App URL.
  // The Google Sheet ID is stored server-side in the Apps Script — NOT exposed here.
  // Deploy steps: Extensions → Apps Script → Deploy → New Deployment → Web App
  //               Execute as: Me | Who has access: Anyone → Copy the URL below.
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVl7iNr-dQOeNKIvtvcBCRWzb_treqxiAW9ogThnd5fTrbxpV7odLr1LkbFFb8KLHu/exec';

  // ── 4. Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    // Honeypot check — bots fill the hidden field
    const honeypot = document.getElementById('honeypot');
    if (honeypot && honeypot.value.trim() !== '') {
      // Silent fail for bots — fake success
      btnText.textContent = '✓ Message Sent';
      submitBtn.style.background = 'var(--teal)';
      submitBtn.style.color = 'var(--dark-0)';
      submitBtn.disabled = true;
      return;
    }

    const name    = document.getElementById('formName').value.trim();
    const email   = document.getElementById('formEmail').value.trim();
    const business = document.getElementById('formBusiness').value.trim();
    const message = document.getElementById('formMessage').value.trim();

    // Basic field validation
    if (!name) { showError('Please enter your name.'); return; }
    if (!email) { showError('Please enter your email address.'); return; }
    if (!isValidEmail(email)) { showError('Please enter a valid email address (e.g. name@example.com).'); return; }
    if (!message) { showError('Please tell me about your bookkeeping needs.'); return; }

    // Disable button while sending
    submitBtn.disabled = true;
    const origText = btnText.textContent;
    btnText.textContent = 'Sending…';

    try {
      const payload = new FormData();
      payload.append('name', name);
      payload.append('email', email);
      payload.append('business', business);
      payload.append('message', message);
      payload.append('submitted_at', new Date().toISOString());

      await fetch(APPS_SCRIPT_URL, { method: 'POST', body: payload, mode: 'no-cors' });

      // no-cors means we can't read the response body — treat as success
      btnText.textContent = '✓ Message Sent';
      submitBtn.style.background = 'var(--teal)';
      submitBtn.style.color = 'var(--dark-0)';
      form.reset();

      setTimeout(() => {
        btnText.textContent = 'Send Message';
        submitBtn.style.background = '';
        submitBtn.style.color = '';
        submitBtn.disabled = false;
      }, 3200);

    } catch (err) {
      showError('Something went wrong. Please try again or contact me directly.');
      btnText.textContent = origText;
      submitBtn.disabled = false;
    }
  });
})();
