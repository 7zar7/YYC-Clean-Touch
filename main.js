/* ── ANIMATION OWNERSHIP CONTRACT — YYC Clean Touch ──
   Stack: vanilla HTML/CSS/JS · GSAP + ScrollTrigger · native scroll · Three.js blob
   Hero: P-14 (oversized text) + P-05 (organic blob, light, morphing)
   Site-wide scrub: 1.5 · Reveals: IntersectionObserver only
   See full contract comment block at top of index.html
*/

// ── 1. REGISTER PLUGINS ──
gsap.registerPlugin(ScrollTrigger);

// ── 2. DEVICE DETECTION (define once, never recompute) ──
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

// ── 5. WEBGL BLOB (P-05) ──
// Owner: blob mesh morphing = idle RAF (gated scroll < 0.05)
//        blob scale/y/opacity = mainTimeline scrub
// Canvas pointer-events: none enforced in CSS
function initBlob() {
  const canvas = document.getElementById('blobCanvas');
  if (!canvas) return null;

  // Gate: no WebGL on low-end or reduced motion
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

  // Blob geometry: IcosahedronGeometry for smooth morphable sphere
  const geometry = new THREE.IcosahedronGeometry(1.4, isMobile ? 4 : 6);
  const posAttr = geometry.attributes.position;
  const originalPos = new Float32Array(posAttr.array);

  // Material: light, monochromatic — P-05 style
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

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x5B9EC9, 0.9);
  dirLight.position.set(2, 3, 4);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x0A2323, 0.3);
  fillLight.position.set(-3, -1, -2);
  scene.add(fillLight);

  // Compile to avoid first-scroll shader hitch
  renderer.compile(scene, camera);

  // Morphing state
  let frame = 0;
  let rafId = null;

  function morphBlob(time) {
    const count = posAttr.count;
    const t = time * 0.0008;
    for (let i = 0; i < count; i++) {
      const ox = originalPos[i * 3];
      const oy = originalPos[i * 3 + 1];
      const oz = originalPos[i * 3 + 2];
      // Simple noise-like distortion using sin/cos combinations
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

    // Frame-skip on low-capability paths
    const skip = isMobile ? frame % 2 !== 0 : false;
    if (skip) return;

    // Morph and idle drift — only when near top of page (contract: scroll < 0.05)
    if (currentScrollProgress < 0.05) {
      morphBlob(time);
      mesh.rotation.y += 0.002;
      mesh.rotation.x += 0.0005;
    }

    renderer.render(scene, camera);
  }

  // Pause RAF when hero is offscreen — §9
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

  // ScrollTrigger: blob scale + fade out as user scrolls (contract owner: mainTimeline)
  gsap.fromTo(mesh.scale, { x: 1, y: 1, z: 1 }, {
    x: 1.3, y: 1.3, z: 1.3,
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: '30% top',
      scrub: 1.5,
      overwrite: 'auto',
    }
  });
  gsap.fromTo(canvas, { opacity: 0 }, {
    opacity: 1,
    duration: 1.2,
    ease: 'power2.out',
    delay: 0.3,
  });
  gsap.to(canvas, {
    opacity: 0,
    scrollTrigger: {
      trigger: '#hero',
      start: '25% top',
      end: '40% top',
      scrub: 1.5,
      overwrite: 'auto',
    }
  });

  // Resize
  const onResize = debounce(() => {
    if (window.scrollY < 100) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      ScrollTrigger.refresh();
    }
  }, 150);
  window.addEventListener('resize', onResize);

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  });

  return mesh;
}

// ── 6. HERO DISPLAY TEXT DRIFT (P-14) ──
// Owner: translateX — slow loop, gated scroll < 0.05
function initDisplayDrift() {
  const display = document.querySelector('.hero-display');
  if (!display || prefersReducedMotion || isMobile) return;

  gsap.to(display, {
    x: '-5vw',
    duration: 20,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    onUpdate() {
      // Yield to scroll — gate drift when past hero
      if (currentScrollProgress > 0.05) gsap.getTweensOf(display)[0]?.pause();
    }
  });
}

// ── 7. HERO ENTRANCE ANIMATIONS ──
// Owner: gsap entrance (fonts.ready gated, property: opacity + y)
function initHeroEntrance() {
  if (prefersReducedMotion) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to('.hero-badge',   { opacity: 1, y: 0, duration: 0.8 }, 0.0)
    .to('.hero-h1',      { opacity: 1, y: 0, duration: 1.0 }, 0.15)
    .to('.hero-sub',     { opacity: 1, y: 0, duration: 0.8 }, 0.35)
    .to('.hero-actions', { opacity: 1, y: 0, duration: 0.8 }, 0.5)
    .to('.trust-bar',    { opacity: 1, y: 0, duration: 0.8 }, 0.65);

  // Set initial states — via gsap.set not CSS class (avoids FOUC per §4)
  gsap.set(['.hero-badge', '.hero-h1', '.hero-sub', '.hero-actions', '.trust-bar'], {
    opacity: 0, y: 30
  });

  return tl;
}

// ── 8. SCROLLTRIGGER: NAV ──
// Owner: nav background/shadow — scroll class toggle
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  ScrollTrigger.create({
    start: 'top+=60 top',
    onEnter: () => nav.classList.add('scrolled'),
    onLeaveBack: () => nav.classList.remove('scrolled'),
  });
}

// ── 9. INTERSECTION OBSERVER REVEALS ──
// Owner: IntersectionObserver — all .reveal elements, fires once
// Never ScrollTrigger.onEnter with native scroll per §6
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
      // Stagger children if container has multiple cards
      const delay = parseFloat(e.target.dataset.delay || 0);
      setTimeout(() => e.target.classList.add('visible'), delay);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    // Auto-stagger sibling cards in grids
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

// ── 10. MOBILE MENU ──
function initMobileMenu() {
  const burger = document.querySelector('.nav-burger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  burger.addEventListener('click', () => {
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(!isOpen));
    menu.setAttribute('aria-hidden', String(isOpen));
    // Animate burger to X
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

  // Close on nav link click
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

// ── 11. SMOOTH SCROLL (native, no Lenis) ──
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

// ── 12. BOOKING FORM (two-step, P-10 / P-13) ──
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

  // Validate step 1 fields
  function validateStep1() {
    const name = document.getElementById('f-name').value.trim();
    const email = document.getElementById('f-email').value.trim();
    const service = document.getElementById('f-service').value;
    return name && email && service;
  }

  btnNext && btnNext.addEventListener('click', () => {
    if (!validateStep1()) {
      // Shake invalid fields
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

  // Contact preference selection
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
    // In production: send to backend / Calendly / email service
    // For now: show confirmation step
    showStep(step2, step3);
  });
}

// ── 13. ROTATING BADGE (P-02) ──
// Handled via CSS animation (@keyframes rotateBadge) — no JS needed

// ── 14. SAFARI / MOBILE: backdrop-filter override ──
// Not used on this site but guard in place per §11
(function backdropGuard() {
  if (isSafari || isMobile) {
    const s = document.createElement('style');
    s.textContent = `.glass{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(247,249,248,.95)!important;}`;
    document.head.appendChild(s);
  }
})();

// ── 15. INIT SEQUENCE ──
document.addEventListener('DOMContentLoaded', () => {

  // Hide hero text until fonts load — prevents FOUC per §4
  document.querySelectorAll('.hero-h1, .hero-sub, .hero-badge').forEach(el => {
    el.style.visibility = 'hidden';
  });

  document.fonts.ready.then(() => {
    // Restore visibility
    document.querySelectorAll('.hero-h1, .hero-sub, .hero-badge').forEach(el => {
      el.style.visibility = 'visible';
    });

    // Init in order per §4
    initNav();
    initBlob();
    initDisplayDrift();
    initHeroEntrance();
    initReveals();
    initMobileMenu();
    initSmoothScroll();
    initBookingForm();

    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.normalizeScroll(!isSafari && !isMobile);
  });

  // ScrollTrigger.refresh only after full load — §4 rule
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
});
