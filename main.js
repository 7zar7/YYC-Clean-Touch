/* ── ANIMATION OWNERSHIP CONTRACT — YYC Clean Touch ──
   Stack: vanilla HTML/CSS/JS · GSAP + ScrollTrigger · native scroll · Three.js blob
   Hero: P-14 (oversized text) + P-05 (organic blob, light, morphing)
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

// ── 5. WEBGL BLOB ──
function initBlob() {
  const canvas = document.getElementById('blobCanvas');
  if (!canvas) return null;
  if (isLowEnd || prefersReducedMotion) {
    canvas.style.display = 'none';
    return null;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 4.5;

  const geometry = new THREE.IcosahedronGeometry(1.4, isMobile ? 4 : 6);
  const posAttr = geometry.attributes.position;
  const originalPos = new Float32Array(posAttr.array);

  const material = new THREE.MeshPhongMaterial({
    color: 0xE8F1F7,
    specular: 0x5B9EC9,
    shininess: isMobile ? 40 : 80,
    transparent: true,
    opacity: 0.75,
    wireframe: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x5B9EC9, 0.9);
  dirLight.position.set(2, 3, 4);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x0A2323, 0.3);
  fillLight.position.set(-3, -1, -2);
  scene.add(fillLight);

  renderer.compile(scene, camera);

  let frame = 0;
  let rafId = null;

  function morphBlob(time) {
    const count = posAttr.count;
    const t = time * 0.0008;
    for (let i = 0; i < count; i++) {
      const ox = originalPos[i * 3];
      const oy = originalPos[i * 3 + 1];
      const oz = originalPos[i * 3 + 2];
      const distort = 0.18 * (
        Math.sin(ox * 2.1 + t * 1.3) *
        Math.cos(oy * 1.8 + t * 0.9) +
        Math.sin(oz * 2.4 + t * 1.1) * 0.5
      );
      posAttr.setXYZ(i, ox + ox * distort, oy + oy * distort, oz + oz * distort);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function animate(time) {
    rafId = requestAnimationFrame(animate);
    frame++;
    const skip = isMobile ? frame % 2 !== 0 : false;
    if (skip) return;
    if (currentScrollProgress < 0.05) {
      morphBlob(time);
      mesh.rotation.y += 0.002;
      mesh.rotation.x += 0.0005;
    }
    renderer.render(scene, camera);
  }

  const heroObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!rafId) rafId = requestAnimationFrame(animate);
      } else {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    });
  });
  heroObs.observe(document.getElementById('hero'));

  gsap.fromTo(mesh.scale, { x: 1, y: 1, z: 1 }, {
    x: 1.3, y: 1.3, z: 1.3,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '30% top', scrub: 1.5, overwrite: 'auto' }
  });
  gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.3 });
  gsap.to(canvas, {
    opacity: 0,
    scrollTrigger: { trigger: '#hero', start: '25% top', end: '40% top', scrub: 1.5, overwrite: 'auto' }
  });

  const onResize = debounce(() => {
    if (window.scrollY < 100) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      ScrollTrigger.refresh();
    }
  }, 150);
  window.addEventListener('resize', onResize);

  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  });

  return mesh;
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
  const step1 = document.getElementById('formStep1');
  const step2 = document.getElementById('formStep2');
  const step3 = document.getElementById('formStep3');
  const btnNext = document.getElementById('btnNext');
  const btnBack = document.getElementById('btnBack');
  const btnClear = document.getElementById('btnClear');
  const btnSubmit = document.getElementById('btnSubmit');
  const choiceCall = document.getElementById('choiceCall');
  const choiceEmail = document.getElementById('choiceEmail');
  if (!step1 || !step2 || !step3) return;

  let contactPref = null;

  function showStep(from, to) {
    if (prefersReducedMotion) {
      from.classList.add('form-step--hidden');
      to.classList.remove('form-step--hidden');
      return;
    }
    gsap.to(from, { opacity: 0, x: -20, duration: 0.3, ease: 'power2.in', onComplete: () => {
      from.classList.add('form-step--hidden');
      to.classList.remove('form-step--hidden');
      gsap.fromTo(to, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
    }});
  }

  function validateStep1() {
    const name = document.getElementById('f-name').value.trim();
    const email = document.getElementById('f-email').value.trim();
    const service = document.getElementById('f-service').value;
    return name && email && service;
  }

  btnNext && btnNext.addEventListener('click', () => {
    if (!validateStep1()) {
      document.querySelectorAll('#formStep1 input:invalid, #formStep1 select:invalid').forEach(el => {
        gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
        el.style.borderColor = '#e07070';
        setTimeout(() => el.style.borderColor = '', 2000);
      });
      return;
    }
    showStep(step1, step2);
  });

  btnBack && btnBack.addEventListener('click', () => showStep(step2, step1));

  btnClear && btnClear.addEventListener('click', () => {
    document.getElementById('f-name').value = '';
    document.getElementById('f-phone').value = '';
    document.getElementById('f-email').value = '';
    document.getElementById('f-service').value = '';
  });

  [choiceCall, choiceEmail].forEach(btn => {
    btn && btn.addEventListener('click', () => {
      choiceCall.classList.remove('selected');
      choiceEmail.classList.remove('selected');
      btn.classList.add('selected');
      contactPref = btn === choiceCall ? 'call' : 'email';
      btnSubmit && (btnSubmit.disabled = false);
    });
  });

  btnSubmit && btnSubmit.addEventListener('click', () => {
    if (!contactPref) return;
    showStep(step2, step3);
  });
}

// ── 14. PRICE CALCULATOR ──
function initCalculator() {
  const calc = document.getElementById('priceCalc');
  if (!calc) return;

  // Pricing matrix (base prices per visit, one-time)
  const BASE_PRICES = {
    regular:          { 1: 119, 2: 149, 3: 179, 4: 209, 5: 239, 6: 269 },
    deep:             { 1: 179, 2: 229, 3: 279, 4: 329, 5: 379, 6: 429 },
    moveinout:        { 1: 199, 2: 259, 3: 319, 4: 379, 5: 439, 6: 499 },
    postconstruction: { 1: 249, 2: 329, 3: 409, 4: 489, 5: 569, 6: 649 },
  };

  // Bathroom surcharge per extra bathroom beyond 1
  const BATHROOM_SURCHARGE = 30;

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
    const bedroomKey = Math.min(state.bedrooms, 6);
    const base = BASE_PRICES[state.type][bedroomKey] || BASE_PRICES[state.type][6];
    const bathroomAdd = Math.max(0, state.bathrooms - 1) * BATHROOM_SURCHARGE;
    const subtotal = base + bathroomAdd;
    const discount = FREQ_DISCOUNT[state.freq];
    const final = Math.round(subtotal * (1 - discount));
    const savedPerVisit = Math.round(subtotal * discount);
    return { final, savedPerVisit, discount };
  }

  function animatePrice(newVal) {
    const el = document.getElementById('calcPrice');
    if (!el) return;
    if (prefersReducedMotion) { el.textContent = '$' + newVal; return; }
    gsap.to(el, {
      opacity: 0, y: -8, duration: 0.15, ease: 'power2.in',
      onComplete: () => {
        el.textContent = '$' + newVal;
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
      ctaEl.addEventListener('click', () => {
        // Pre-fill the service dropdown
        const serviceMap = {
          regular: 'regular', deep: 'deep',
          moveinout: 'movein', postconstruction: 'postconstruction'
        };
        const serviceEl = document.getElementById('f-service');
        if (serviceEl) serviceEl.value = serviceMap[state.type] || '';
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
    if (state.bathrooms >= 4) return;
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

// ── 15.5 BEFORE / AFTER SLIDERS ──
function initBeforeAfter() {
  document.querySelectorAll('[data-ba-slider]').forEach(slider => {
    let active = false;

    const setPos = (clientX) => {
      const rect = slider.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      slider.style.setProperty('--ba', (x / rect.width) * 100 + '%');
    };

    slider.addEventListener('pointerdown', (e) => {
      active = true;
      try { slider.setPointerCapture(e.pointerId); } catch (_) {}
      setPos(e.clientX);
    });
    slider.addEventListener('pointermove', (e) => {
      if (active) setPos(e.clientX);
    });
    const release = (e) => {
      if (!active) return;
      active = false;
      try { slider.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    slider.addEventListener('pointerup', release);
    slider.addEventListener('pointercancel', release);
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
    initBlob();
    initDisplayDrift();
    initHeroEntrance();
    initStatsCounter();
    initReveals();
    initMobileMenu();
    initSmoothScroll();
    initBookingForm();
    initCalculator();
    initBeforeAfter();

    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.normalizeScroll(!isSafari && !isMobile);
  });

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
});
