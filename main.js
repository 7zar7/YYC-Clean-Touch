/* ── ANIMATION OWNERSHIP CONTRACT — YYC Clean Touch ──
   Stack: vanilla HTML/CSS/JS · GSAP + ScrollTrigger · native scroll
   Hero: P-14 (oversized text) + arch portal (scroll-pinned reveal)
   Site-wide scrub: 1.5 · Reveals: IntersectionObserver only
*/

gsap.registerPlugin(ScrollTrigger);

// ── 2. DEVICE DETECTION ──
const UA = navigator.userAgent;
const isMobile = /iPhone|iPad|iPod|Android/i.test(UA) || window.innerWidth < 768;
const isSafari = /^((?!chrome|android).)*safari/i.test(UA);
const isIOS = /iPhone|iPad|iPod/i.test(UA);
const isLowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover)').matches;

// ── 3. SCROLL TRACKING ──
let currentScrollProgress = 0;
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  currentScrollProgress = max > 0 ? window.scrollY / max : 0;
}, { passive: true });

// ── 4. UTILITIES ──
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── 5. ARCH PORTAL (scroll-pinned reveal) ──
function initPortal() {
  const portal  = document.querySelector('.arch-portal');
  const display = document.querySelector('.hero-display');
  const before  = document.querySelector('.layer-before');
  if (!portal) return;

  // Mobile: wrapper is hidden via CSS — skip entirely
  if (isMobile) return;
  // Reduced-motion (desktop): show static arch at fixed scale, no scroll pin
  if (prefersReducedMotion) {
    gsap.set(portal, { scale: 0.6 });
    return;
  }

  const hero = document.getElementById('hero');
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: '+=150%',
      pin: true,
      scrub: 1,
      onUpdate: (self) => {
        hero.classList.toggle('hero-portal-open', self.progress > 0.25);
      }
    }
  });

  // 0 → 1: arch grows to fill viewport, hero-display fades out
  tl.to(portal,  { scale: 1, borderRadius: '0px', duration: 1, ease: 'none' }, 0);
  tl.to(display, { opacity: 0, duration: 1, ease: 'none' }, 0);
  // 0.3 → 1: before image fades out, revealing the after image
  tl.to(before,  { opacity: 0, duration: 0.7, ease: 'none' }, 0.3);
}

// ── 6. HERO DISPLAY DRIFT ──
function initDisplayDrift() {
  const display = document.querySelector('.hero-display');
  if (!display || prefersReducedMotion || isMobile) return;
  gsap.to(display, {
    x: '-5vw', duration: 20, repeat: -1, yoyo: true, ease: 'sine.inOut',
    onUpdate() {
      if (currentScrollProgress > 0.05) gsap.getTweensOf(display)[0]?.pause();
    }
  });
}

// ── 7. HERO ENTRANCE ──
function initHeroEntrance() {
  if (prefersReducedMotion) return;
  gsap.set(['.hero-badge', '.hero-h1', '.hero-sub', '.hero-actions', '.hero-stats', '.trust-bar'], {
    opacity: 0, y: 30
  });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.hero-badge',   { opacity: 1, y: 0, duration: 0.8 }, 0.0)
    .to('.hero-h1',      { opacity: 1, y: 0, duration: 1.0 }, 0.15)
    .to('.hero-sub',     { opacity: 1, y: 0, duration: 0.8 }, 0.35)
    .to('.hero-actions', { opacity: 1, y: 0, duration: 0.8 }, 0.5)
    .to('.hero-stats',   { opacity: 1, y: 0, duration: 0.8 }, 0.65)
    .to('.trust-bar',    { opacity: 1, y: 0, duration: 0.8 }, 0.75);
  return tl;
}

// ── 8. STATS COUNTER ANIMATION ──
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.hero-stat-number[data-target]');
  if (!statNumbers.length || prefersReducedMotion) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      const target = parseInt(e.target.dataset.target, 10);
      const duration = 1800;
      const start = performance.now();
      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        e.target.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
        else e.target.textContent = target;
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => obs.observe(el));
}

// ── 9. NAV ──
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  ScrollTrigger.create({
    start: 'top+=60 top',
    onEnter: () => nav.classList.add('scrolled'),
    onLeaveBack: () => nav.classList.remove('scrolled'),
  });
}

// ── 10. REVEALS ──
function initReveals() {
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  const seen = new Set();
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting || seen.has(e.target)) return;
      seen.add(e.target);
      obs.unobserve(e.target);
      const delay = parseFloat(e.target.dataset.delay || 0);
      setTimeout(() => e.target.classList.add('visible'), delay);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach((el) => {
    const parent = el.parentElement;
    if (parent && (parent.classList.contains('services-grid') ||
                   parent.classList.contains('plans-grid') ||
                   parent.classList.contains('detailing-grid') ||
                   parent.classList.contains('testimonials-grid'))) {
      const siblings = Array.from(parent.querySelectorAll('.reveal'));
      const idx = siblings.indexOf(el);
      el.dataset.delay = idx * 100;
    }
    obs.observe(el);
  });
}

// ── 10.5 SECTION H2 HORIZONTAL REVEALS ──
function initSectionH2Reveals() {
  if (isMobile || prefersReducedMotion) return;

  const h2s = document.querySelectorAll('section h2');
  h2s.forEach((h2, i) => {
    h2.classList.add('h2-reveal', i % 2 === 0 ? 'h2-reveal--left' : 'h2-reveal--right');
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('h2-reveal--in');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.2 });

  h2s.forEach(h2 => obs.observe(h2));
}

// ── 11. MOBILE MENU ──
function initMobileMenu() {
  const burger = document.querySelector('.nav-burger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  burger.addEventListener('click', () => {
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(!isOpen));
    menu.setAttribute('aria-hidden', String(isOpen));
    const spans = burger.querySelectorAll('span');
    if (!isOpen) {
      gsap.to(spans[0], { rotation: 45, y: 6.5, duration: 0.3 });
      gsap.to(spans[1], { opacity: 0, duration: 0.3 });
      gsap.to(spans[2], { rotation: -45, y: -6.5, duration: 0.3 });
    } else {
      gsap.to(spans[0], { rotation: 0, y: 0, duration: 0.3 });
      gsap.to(spans[1], { opacity: 1, duration: 0.3 });
      gsap.to(spans[2], { rotation: 0, y: 0, duration: 0.3 });
    }
  });

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      const spans = burger.querySelectorAll('span');
      gsap.to(spans[0], { rotation: 0, y: 0, duration: 0.3 });
      gsap.to(spans[1], { opacity: 1, duration: 0.3 });
      gsap.to(spans[2], { rotation: 0, y: 0, duration: 0.3 });
    });
  });
}

// ── 12. SMOOTH SCROLL ──
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });
}

// ── 13. BOOKING FORM ──
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const confirm = document.getElementById('formConfirm');
  const actions = document.getElementById('bookingActions');
  const bookOnlineBtn = document.getElementById('btnBookOnline');
  if (!form || !confirm) return;

  const flagInvalid = (el) => {
    gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    el.style.borderColor = '#e07070';
    setTimeout(() => el.style.borderColor = '', 2000);
  };

  if (bookOnlineBtn && actions) {
    bookOnlineBtn.addEventListener('click', () => {
      actions.classList.add('booking-actions--hidden');
      form.classList.remove('booking-form--hidden');
      if (!prefersReducedMotion) {
        gsap.fromTo(form, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      }
      const firstField = document.getElementById('f-name');
      if (firstField) firstField.focus();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('f-name');
    const phoneEl = document.getElementById('f-phone');
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();

    if (!name) { flagInvalid(nameEl); return; }
    if (!phone) { flagInvalid(phoneEl); return; }

    const reveal = () => {
      form.style.display = 'none';
      confirm.classList.remove('form-step--hidden');
    };

    if (prefersReducedMotion) {
      reveal();
    } else {
      gsap.to(form, {
        opacity: 0, y: -10, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          reveal();
          gsap.fromTo(confirm, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        }
      });
    }
  });
}

// ── 14. PRICE CALCULATOR ──
function initCalculator() {
  const calc = document.getElementById('priceCalc');
  if (!calc) return;

  // Base price lookup by bedrooms-bathrooms (regular cleaning, one-time)
  const PRICE_TABLE = {
    '1-1': 149,
    '2-1': 199,
    '2-2': 249,
    '3-2': 299,
    '3-3': 349,
    '4-3': 399,
    '4-4': 449,
    '5-4': 499,
    '5-5': 549,
    '6-6': 599,
  };

  function getBasePrice(bedrooms, bathrooms) {
    const key = bedrooms + '-' + bathrooms;
    if (PRICE_TABLE[key]) return PRICE_TABLE[key];
    // Find closest match — nearest bedroom count
    const keys = Object.keys(PRICE_TABLE);
    const sorted = keys.filter(k => parseInt(k) <= bedrooms).sort();
    return PRICE_TABLE[sorted[sorted.length - 1]] || 149;
  }

  // Service type multipliers
  const TYPE_MULTIPLIER = {
    regular:          1.0,
    deep:             1.6,
    moveinout:        1.8,
    postconstruction: 2.0,
  };

  // Frequency discounts
  const FREQ_DISCOUNT = {
    onetime:  0,
    monthly:  0.05,
    biweekly: 0.10,
    weekly:   0.15,
  };

  // Frequency labels
  const FREQ_LABEL = {
    onetime:  'one-time',
    monthly:  '/visit · monthly',
    biweekly: '/visit · bi-weekly',
    weekly:   '/visit · weekly',
  };

  let state = {
    type: 'regular',
    bedrooms: 2,
    bathrooms: 1,
    freq: 'monthly',
  };

  function calcPrice() {
    const base = getBasePrice(state.bedrooms, state.bathrooms);
    const subtotal = base * (TYPE_MULTIPLIER[state.type] || 1);
    const discount = FREQ_DISCOUNT[state.freq];
    const final = Math.round(subtotal * (1 - discount));
    const savedPerVisit = Math.round(subtotal * discount);
    return { final, savedPerVisit, discount };
  }

  function animatePrice(newVal) {
    const el = document.getElementById('calcPrice');
    if (!el) return;
    if (prefersReducedMotion) { el.textContent = 'From $' + newVal; return; }
    gsap.to(el, {
      opacity: 0, y: -8, duration: 0.15, ease: 'power2.in',
      onComplete: () => {
        el.textContent = 'From $' + newVal;
        gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
      }
    });
  }

  function updateDisplay() {
    const { final, savedPerVisit, discount } = calcPrice();
    animatePrice(final);

    const perEl = document.getElementById('calcPricePer');
    if (perEl) perEl.textContent = FREQ_LABEL[state.freq];

    const savingsEl = document.getElementById('calcSavings');
    if (savingsEl) {
      if (savedPerVisit > 0) {
        savingsEl.innerHTML = `<span class="calc-saving-badge">You save $${savedPerVisit}/visit · ${Math.round(discount * 100)}% off</span>`;
      } else {
        savingsEl.innerHTML = '';
      }
    }

    // Update CTA with service info for pre-filling the form
    const ctaEl = document.getElementById('calcCta');
    if (ctaEl) {
      ctaEl.href = `#booking`;
      ctaEl.textContent = 'Book This Clean →';
      ctaEl.addEventListener('click', () => {
        // Pre-fill the service dropdown
        const serviceMap = {
          regular: 'regular', deep: 'deep',
          moveinout: 'movein', postconstruction: 'postconstruction'
        };
        const serviceEl = document.getElementById('f-service');
        if (serviceEl) {
          serviceEl.value = serviceMap[state.type] || '';
        }
      });
    }
  }

  function applyTypeMode(type) {
    const isRegular = type === 'regular';
    document.getElementById('calcFreqRow')?.classList.toggle('calc-row--hidden', !isRegular);
    if (!isRegular) {
      state.freq = 'onetime';
      document.querySelectorAll('#calcFreq .calc-opt').forEach(b => {
        b.classList.toggle('calc-opt--active', b.dataset.freq === 'onetime');
      });
    }
  }

  // Type buttons
  const typeContainer = document.getElementById('calcType');
  typeContainer && typeContainer.querySelectorAll('.calc-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      typeContainer.querySelectorAll('.calc-opt').forEach(b => b.classList.remove('calc-opt--active'));
      btn.classList.add('calc-opt--active');
      state.type = btn.dataset.type;
      applyTypeMode(state.type);
      updateDisplay();
    });
  });

  // Freq buttons
  const freqContainer = document.getElementById('calcFreq');
  freqContainer && freqContainer.querySelectorAll('.calc-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      freqContainer.querySelectorAll('.calc-opt').forEach(b => b.classList.remove('calc-opt--active'));
      btn.classList.add('calc-opt--active');
      state.freq = btn.dataset.freq;
      updateDisplay();
    });
  });

  // Bedroom stepper
  document.getElementById('bedroomMinus') && document.getElementById('bedroomMinus').addEventListener('click', () => {
    if (state.bedrooms <= 1) return;
    state.bedrooms--;
    document.getElementById('bedroomCount').textContent = state.bedrooms;
    updateDisplay();
  });
  document.getElementById('bedroomPlus') && document.getElementById('bedroomPlus').addEventListener('click', () => {
    if (state.bedrooms >= 6) return;
    state.bedrooms++;
    document.getElementById('bedroomCount').textContent = state.bedrooms;
    updateDisplay();
  });

  // Bathroom stepper
  document.getElementById('bathroomMinus') && document.getElementById('bathroomMinus').addEventListener('click', () => {
    if (state.bathrooms <= 1) return;
    state.bathrooms--;
    document.getElementById('bathroomCount').textContent = state.bathrooms;
    updateDisplay();
  });
  document.getElementById('bathroomPlus') && document.getElementById('bathroomPlus').addEventListener('click', () => {
    if (state.bathrooms >= 6) return;
    state.bathrooms++;
    document.getElementById('bathroomCount').textContent = state.bathrooms;
    updateDisplay();
  });

  // Initial render
  updateDisplay();
}

// ── 15. SAFARI / MOBILE: backdrop-filter override ──
(function backdropGuard() {
  if (isSafari || isMobile) {
    const s = document.createElement('style');
    s.textContent = `.glass{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(247,249,248,.95)!important;}`;
    document.head.appendChild(s);
  }
})();

// ── 15.3 PLANS CAROUSEL ──
function initPlansTabs() {
  const tabs  = document.querySelectorAll('.plans-tab');
  const cards = document.querySelectorAll('.plan-card[data-plan]');
  const sumName   = document.querySelector('.plans-summary-name');
  const sumAmount = document.querySelector('.plans-summary-amount');
  if (!tabs.length || !cards.length) return;

  const PLAN_DATA = {
    bronze: { name: 'Bronze', freq: 'Monthly',   price: '$149' },
    silver: { name: 'Silver', freq: 'Bi-Weekly', price: '$139' },
    gold:   { name: 'Gold',   freq: 'Weekly',    price: '$129' },
  };

  function setActive(planId) {
    if (!PLAN_DATA[planId]) return;
    tabs.forEach(t => {
      const on = t.dataset.plan === planId;
      t.classList.toggle('plans-tab--active', on);
      if (on) t.setAttribute('aria-selected', 'true');
      else t.removeAttribute('aria-selected');
    });
    cards.forEach(c => c.classList.toggle('plan-card--active', c.dataset.plan === planId));

    const d = PLAN_DATA[planId];
    if (sumName)   sumName.innerHTML = `${d.name} <span class="plans-summary-freq">· ${d.freq}</span>`;
    if (sumAmount) sumAmount.textContent = d.price;
  }

  tabs.forEach(t => t.addEventListener('click', () => setActive(t.dataset.plan)));
}

// ── 15.4 STICKY CTA BAR ──
function initStickyCTA() {
  const bar = document.getElementById('stickyCta');
  if (!bar) return;

  // Sections that should HIDE the bar (hero = not yet scrolled past;
  // services/plans/booking already have their own CTAs)
  const hideIds = ['hero', 'services', 'plans', 'booking'];
  const targets = hideIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const inView = new Set();

  const apply = () => {
    const shouldShow = inView.size === 0;
    bar.classList.toggle('sticky-cta--visible', shouldShow);
    bar.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) inView.add(e.target.id);
      else inView.delete(e.target.id);
    });
    apply();
  }, { threshold: 0.08 });

  targets.forEach(el => observer.observe(el));
}

// ── 15.5 BEFORE / AFTER SLIDERS ──
function initBeforeAfter() {
  document.querySelectorAll('.ba-slider').forEach(slider => {
    let active = false;

    const setPos = (clientX) => {
      const rect = slider.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      slider.style.setProperty('--ba', (x / rect.width) * 100 + '%');
    };

    // Pointer events — mouse, stylus, modern touch
    slider.addEventListener('pointerdown', (e) => {
      active = true;
      try { slider.setPointerCapture(e.pointerId); } catch (_) {}
      setPos(e.clientX);
    });
    slider.addEventListener('pointermove', (e) => {
      if (active) setPos(e.clientX);
    });
    const releasePointer = (e) => {
      if (!active) return;
      active = false;
      try { slider.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    slider.addEventListener('pointerup', releasePointer);
    slider.addEventListener('pointercancel', releasePointer);

    // Touch events — fallback for older iOS Safari & Android browsers
    // where pointer events on transformed/absolute children misbehave
    slider.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      active = true;
      setPos(e.touches[0].clientX);
    }, { passive: true });
    slider.addEventListener('touchmove', (e) => {
      if (!active || !e.touches[0]) return;
      e.preventDefault();
      setPos(e.touches[0].clientX);
    }, { passive: false });
    const releaseTouch = () => { active = false; };
    slider.addEventListener('touchend', releaseTouch);
    slider.addEventListener('touchcancel', releaseTouch);
  });
}

// ── 15.5 DETAILING TOGGLE ──
function initDetailingToggle() {
  document.getElementById('detailingToggleBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('detailing-panel');
    const btn = document.getElementById('detailingToggleBtn');
    const isOpen = panel.style.display === 'block';
    panel.style.display = isOpen ? 'none' : 'block';
    btn.textContent = isOpen ? 'See Auto Detailing →' : 'Hide Detailing ↑';
    if (!isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ── 16. INIT SEQUENCE ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.hero-h1, .hero-sub, .hero-badge').forEach(el => {
    el.style.visibility = 'hidden';
  });

  document.fonts.ready.then(() => {
    document.querySelectorAll('.hero-h1, .hero-sub, .hero-badge').forEach(el => {
      el.style.visibility = 'visible';
    });

    initNav();
    initPortal();
    initDisplayDrift();
    initHeroEntrance();
    initStatsCounter();
    initReveals();
    initSectionH2Reveals();
    initMobileMenu();
    initSmoothScroll();
    initBookingForm();
    initCalculator();
    initBeforeAfter();
    initStickyCTA();
    initPlansTabs();
    initDetailingToggle();

    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.normalizeScroll(!isSafari && !isMobile);
  });

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
});
