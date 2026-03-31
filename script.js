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

// ── CONTACT FORM (demo feedback)
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = '✓ Message Sent';
    btn.style.background = 'var(--teal)';
    btn.style.color      = 'var(--dark-0)';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent  = orig;
      btn.style.background = '';
      btn.style.color      = '';
      btn.disabled = false;
      form.reset();
    }, 3200);
  });
}
