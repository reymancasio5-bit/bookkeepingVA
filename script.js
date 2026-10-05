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
function setMobileMenuOpen(isOpen) {
  navLinks.classList.toggle('open', isOpen);
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
}
hamburger.addEventListener('click', () => {
  setMobileMenuOpen(!navLinks.classList.contains('open'));
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

    setMobileMenuOpen(false);

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
    setMobileMenuOpen(false);
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

// ── STARFIELD BACKGROUND
(function initStarfield() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  canvas.className = 'space-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stars = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastFrame = 0;
  let startTime = 0;
  let running = false;

  function randomGenerator(seed) {
    let value = seed;
    return () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.25);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const random = randomGenerator(Math.round(width * 31 + height * 17) || 1);
    const starCount = width < 768 ? 190 : 440;
    stars = Array.from({ length: starCount }, () => {
      const brightness = random();
      const hue = random() > 0.92 ? (random() > 0.5 ? 205 : 35) : 0;
      return {
        x: random() * width,
        y: random() * height,
        radius: brightness > 0.985 ? 1.25 + random() * 0.75 : 0.35 + brightness * 0.75,
        alpha: 0.24 + random() * 0.58,
        hue,
        phase: random() * Math.PI * 2,
        frequency: 0.25 + random() * 0.65,
        drift: (random() - 0.5) * 0.018,
        prominent: brightness > 0.985,
      };
    });
    drawStarfield(0);
  }

  function drawStarfield(time) {
    context.clearRect(0, 0, width, height);
    const nebulae = [
      { x: width * 0.18, y: height * 0.32, radius: Math.max(width, height) * 0.42, color: '70,86,170' },
      { x: width * 0.82, y: height * 0.68, radius: Math.max(width, height) * 0.34, color: '58,103,153' },
    ];
    nebulae.forEach((nebula) => {
      const haze = context.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
      haze.addColorStop(0, `rgba(${nebula.color},0.075)`);
      haze.addColorStop(1, `rgba(${nebula.color},0)`);
      context.fillStyle = haze;
      context.fillRect(0, 0, width, height);
    });
    context.save();
    context.globalCompositeOperation = 'screen';
    stars.forEach((star) => {
      const shimmer = 0.72 + Math.sin(time * star.frequency + star.phase) * 0.22;
      const y = (star.y + time * star.drift + height) % height;
      const color = star.hue === 0 ? '220,232,255'
        : star.hue === 205 ? '164,211,255' : '255,225,190';
      context.beginPath();
      context.arc(star.x, y, star.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color},${(star.alpha * shimmer).toFixed(3)})`;
      context.fill();

      if (star.prominent) {
        const glow = context.createRadialGradient(star.x, y, 0, star.x, y, star.radius * 5);
        glow.addColorStop(0, `rgba(${color},${(0.26 * shimmer).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${color},0)`);
        context.fillStyle = glow;
        context.fillRect(star.x - star.radius * 5, y - star.radius * 5, star.radius * 10, star.radius * 10);
      }
    });
    context.restore();
  }

  function animate(now) {
    if (!running) return;
    frame = window.requestAnimationFrame(animate);
    const frameInterval = width < 768 ? 1000 / 18 : 1000 / 24;
    if (now - lastFrame < frameInterval) return;
    lastFrame = now;
    drawStarfield((now - startTime) / 1000);
  }

  function updateAnimation() {
    running = !motionPreference.matches && !document.hidden;
    if (running) {
      startTime = performance.now();
      lastFrame = 0;
      frame = window.requestAnimationFrame(animate);
    } else {
      window.cancelAnimationFrame(frame);
      drawStarfield(0);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', updateAnimation);
  if (motionPreference.addEventListener) {
    motionPreference.addEventListener('change', updateAnimation);
  } else {
    motionPreference.addListener(updateAnimation);
  }
  resize();
  updateAnimation();
})();

// ── GALLERY LIGHTBOX
(function initLightbox() {
  // Create overlay elements once
  const overlay = document.createElement('div');
  overlay.id = 'lightbox';
  overlay.style.cssText = `
    display:none;position:fixed;inset:0;z-index:9999;
    background:rgba(8,14,24,0.96);backdrop-filter:blur(12px);
    align-items:center;justify-content:center;cursor:zoom-out;
    padding:24px;
  `;

  const img = document.createElement('img');
  img.style.cssText = `
    max-width:92vw;max-height:88vh;border-radius:10px;
    border:1px solid rgba(29,233,182,0.2);
    box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(29,233,182,0.06);
    object-fit:contain;display:block;
    transform:scale(0.92);opacity:0;
    transition:transform 0.3s cubic-bezier(0.4,0,0.2,1),opacity 0.3s ease;
    cursor:default;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.style.cssText = `
    position:fixed;top:20px;right:24px;
    background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
    color:#e8edf5;width:40px;height:40px;border-radius:50%;
    font-size:1rem;cursor:pointer;display:flex;align-items:center;
    justify-content:center;transition:background 0.2s ease,border-color 0.2s ease;
    z-index:10000;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(29,233,182,0.15)';
    closeBtn.style.borderColor = 'rgba(29,233,182,0.4)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(255,255,255,0.07)';
    closeBtn.style.borderColor = 'rgba(255,255,255,0.12)';
  });

  const prevBtn = document.createElement('button');
  const nextBtn = document.createElement('button');
  [prevBtn, nextBtn].forEach((btn, i) => {
    btn.innerHTML = `<i class="fas fa-chevron-${i === 0 ? 'left' : 'right'}"></i>`;
    btn.style.cssText = `
      position:fixed;top:50%;transform:translateY(-50%);
      ${i === 0 ? 'left:20px' : 'right:20px'};
      background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
      color:#e8edf5;width:44px;height:44px;border-radius:50%;
      font-size:1rem;cursor:pointer;display:flex;align-items:center;
      justify-content:center;transition:background 0.2s ease,border-color 0.2s ease;
      z-index:10000;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(29,233,182,0.15)';
      btn.style.borderColor = 'rgba(29,233,182,0.4)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255,255,255,0.07)';
      btn.style.borderColor = 'rgba(255,255,255,0.12)';
    });
  });

  const counter = document.createElement('span');
  counter.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    font-family:'Space Mono',monospace;font-size:0.72rem;
    color:rgba(29,233,182,0.7);letter-spacing:0.12em;z-index:10000;
  `;

  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  overlay.appendChild(prevBtn);
  overlay.appendChild(nextBtn);
  overlay.appendChild(counter);
  document.body.appendChild(overlay);

  let images = [];
  let current = 0;

  function openLightbox(index) {
    current = index;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showImage(current);
    requestAnimationFrame(() => {
      img.style.transform = 'scale(1)';
      img.style.opacity = '1';
    });
  }

  function closeLightbox() {
    img.style.transform = 'scale(0.92)';
    img.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 280);
  }

  function showImage(index) {
    img.style.transform = 'scale(0.96)';
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = images[index].src;
      img.alt = images[index].alt;
      counter.textContent = `${index + 1} / ${images.length}`;
      prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
      nextBtn.style.display = images.length > 1 ? 'flex' : 'none';
      requestAnimationFrame(() => {
        img.style.transform = 'scale(1)';
        img.style.opacity = '1';
      });
    }, 150);
  }

  function navigate(dir) {
    current = (current + dir + images.length) % images.length;
    showImage(current);
  }

  // Attach click listeners to all gallery images (current + future)
  function bindGalleryImages() {
    document.querySelectorAll('.proj-detail__gallery img').forEach((el, i) => {
      if (el.dataset.lightboxBound) return;
      el.dataset.lightboxBound = 'true';
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', () => {
        images = Array.from(el.closest('.proj-detail__gallery')
          .querySelectorAll('img'))
          .map(im => ({ src: im.src, alt: im.alt }));
        openLightbox(i);
      });
    });
  }

  bindGalleryImages();

  // Close on overlay background click
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (overlay.style.display === 'none') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
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
