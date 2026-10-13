const canvas = document.getElementById('heroScene');
const hero = document.querySelector('.hero');
const sculpture = document.querySelector('.hero__right');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function createOrbitalScene() {
  if (!canvas || !hero || !sculpture) return;
  let renderer;
  try {
    // Decoration loads independently; copy and navigation never depend on WebGL.
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const mobile = window.innerWidth <= 768;
    sculpture.prepend(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
    camera.position.set(0, 0, 8.5);
    scene.add(new THREE.HemisphereLight(0xdde8bb, 0x18251d, 2));
    const key = new THREE.DirectionalLight(0xf4f6cf, 4.5);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc4e79a, 3);
    rim.position.set(3, 0, -2);
    scene.add(rim);
    const fill = new THREE.PointLight(0xdcedb4, 12, 12);
    fill.position.set(-2, 1, 3);
    scene.add(fill);

    // Broad studio reflections give the metal and glass a dimensional finish.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x263425);
    const panels = [];
    [[-4, 4, 3, 0xfff4d8], [4, 1, -3, 0xc8efab], [0, -5, 2, 0x405637]].forEach(([x,y,z,color]) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      panel.position.set(x,y,z);
      panel.lookAt(0,0,0);
      studio.add(panel);
      panels.push(panel);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, .1);
    scene.environment = environment.texture;
    panels.forEach(panel => { panel.geometry.dispose(); panel.material.dispose(); });
    pmrem.dispose();

    const assembly = new THREE.Group();
    assembly.rotation.set(.14, 0, -.28);
    assembly.position.y = .22;
    scene.add(assembly);
    const cage = new THREE.Group();
    assembly.add(cage);
    const metal = new THREE.MeshPhysicalMaterial({ color: 0xd4e9a4, metalness: .62, roughness: .28, clearcoat: 1, clearcoatRoughness: .22, envMapIntensity: 1.1 });
    const orbitMetal = new THREE.MeshPhysicalMaterial({ color: 0xe4efb8, metalness: .5, roughness: .24, emissive: 0x8caa46, emissiveIntensity: .1 });
    const segments = mobile ? 64 : 112;
    const ringSegments = mobile ? 5 : 8;
    const radius = 1.62;
    // Real tubes, rather than flat lines: every ring has thickness and highlights.
    for (let latitude = -70; latitude <= 70; latitude += 20) {
      const angle = THREE.MathUtils.degToRad(latitude);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * Math.cos(angle), .021, ringSegments, segments), metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = radius * Math.sin(angle);
      cage.add(ring);
    }
    const meridianGeometry = new THREE.TorusGeometry(radius, .017, ringSegments, segments);
    for (let longitude = 0; longitude < 180; longitude += 22.5) {
      const ring = new THREE.Mesh(meridianGeometry, metal);
      ring.rotation.y = THREE.MathUtils.degToRad(longitude);
      cage.add(ring);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(.96, mobile ? 32 : 56, mobile ? 24 : 40), new THREE.MeshPhysicalMaterial({
      color: 0x688743, metalness: .42, roughness: .19, clearcoat: 1, clearcoatRoughness: .13,
      emissive: 0x284518, emissiveIntensity: .25, envMapIntensity: 1.5,
    }));
    assembly.add(core);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.03, 32, 24), new THREE.MeshPhysicalMaterial({
      color: 0xc6e5a0, metalness: .1, roughness: .08, transparent: true, opacity: .09, depthWrite: false,
      side: THREE.FrontSide, envMapIntensity: 1.8,
    }));
    assembly.add(glass);

    const satellites = [];
    const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf2f8d1, roughness: .16, metalness: .25, emissive: 0xc3d884, emissiveIntensity: .25 });
    const pearlGeometry = new THREE.SphereGeometry(.053, 16, 12);
    [[2.06,.62,.2], [1.93,-.8,1.1]].forEach(([r,x,z], index) => {
      const orbit = new THREE.Group();
      orbit.rotation.set(x, .25, z);
      orbit.add(new THREE.Mesh(new THREE.TorusGeometry(r, .012, ringSegments, segments), orbitMetal));
      const satellite = new THREE.Mesh(pearlGeometry, pearl);
      orbit.add(satellite);
      assembly.add(orbit);
      satellites.push({ satellite, r, offset: index * Math.PI, speed: index ? -.18 : .22 });
    });

    let inView = false;
    let contextLost = false;
    let animationFrame = 0;
    let previousFrame = null;
    let elapsed = 0;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const resetPointer = () => { pointer.targetX = 0; pointer.targetY = 0; };
    hero.addEventListener('pointermove', event => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
      const bounds = hero.getBoundingClientRect();
      pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    }, { passive: true });
    hero.addEventListener('pointerleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    finePointer.addEventListener('change', resetPointer);
    const draw = () => renderer.render(scene, camera);
    const canAnimate = () => inView && !document.hidden && !reducedMotion.matches && !contextLost;
    const animate = time => {
      animationFrame = 0;
      if (!canAnimate()) return;
      // Follow the display refresh rate; elapsed time keeps motion consistent on
      // 60/120Hz screens. Clamp long frames so returning tabs never jump ahead.
      {
        const delta = previousFrame === null ? 0 : Math.min((time - previousFrame) / 1000, .05);
        elapsed += delta;
        previousFrame = time;
        const settle = 1 - Math.exp(-3.5 * delta);
        pointer.x += (pointer.targetX - pointer.x) * settle;
        pointer.y += (pointer.targetY - pointer.y) * settle;
        cage.rotation.y = elapsed * .075;
        assembly.rotation.y = Math.sin(elapsed * .13) * .10 + pointer.x * .12;
        assembly.rotation.x = .14 + Math.sin(elapsed * .17) * .035 + pointer.y * .075;
        assembly.position.y = .22 + Math.sin(elapsed * .65) * (mobile ? .025 : .045);
        core.rotation.y = -elapsed * .045;
        satellites.forEach(({satellite,r,offset,speed}) => {
          const angle = elapsed * speed + offset;
          satellite.position.set(Math.cos(angle)*r, Math.sin(angle)*r, 0);
        });
        draw();
      }
      animationFrame = requestAnimationFrame(animate);
    };
    const updateAnimation = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = null;
      if (reducedMotion.matches || document.hidden) {
        resetPointer();
        pointer.x = 0;
        pointer.y = 0;
      }
      if (canAnimate()) animationFrame = requestAnimationFrame(animate);
      else if (inView && !document.hidden && !contextLost) draw();
    };
    const resize = () => {
      const { width, height } = sculpture.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      assembly.scale.setScalar(Math.min(1.12, width / height * 1.08));
      updateAnimation();
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; updateAnimation(); });
    observer.observe(sculpture);
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(sculpture);
    document.addEventListener('visibilitychange', updateAnimation);
    reducedMotion.addEventListener('change', updateAnimation);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); contextLost = true; hero.classList.remove('has-webgl'); updateAnimation();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      contextLost = false; hero.classList.add('has-webgl'); updateAnimation();
    });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(animationFrame); animationFrame = 0; });
    window.addEventListener('pageshow', updateAnimation);
    // Place satellites on their tracks even when reduced motion is enabled.
    satellites.forEach(({ satellite, r, offset }) => {
      satellite.position.set(Math.cos(offset) * r, Math.sin(offset) * r, 0);
    });
    resize();
    draw();
    hero.classList.add('has-webgl');
  } catch (error) {
    renderer?.dispose();
    hero.classList.remove('has-webgl');
    console.warn('Using the static orbital sculpture.', error);
  }
}

createOrbitalScene();
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if (!gsap) {
  window.clearTimeout(window.heroIntroFailsafe);
  document.documentElement.classList.remove('hero-intro-pending');
  console.error('GSAP is required to initialize hero motion.');
} else if (reducedMotion.matches) {
  window.clearTimeout(window.heroIntroFailsafe);
  document.documentElement.classList.remove('hero-intro-pending');
} else {
  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  } else {
    console.warn('ScrollTrigger is unavailable; in-view motion has been disabled.');
  }

  const compact = window.matchMedia('(max-width: 768px)').matches;
  const entranceElements = '.hero__eyebrow, .hero__title, .hero__subtitle, .hero__ctas, .hero__right, .hero__stats__inner, .hero__scroll';
  const revealTweens = [];
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'transform,opacity,visibility' } });
  gsap.set(entranceElements, {
    autoAlpha: 0,
    y: compact ? 12 : 24,
  });
  gsap.set('.hero__right', { scale: .97, y: compact ? 10 : 18 });
  timeline
    .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: .55 }, .04)
    .to('.hero__title', { autoAlpha: 1, y: 0, duration: .85 }, .12)
    .to('.hero__subtitle', { autoAlpha: 1, y: 0, duration: .7 }, .24)
    .to('.hero__ctas', { autoAlpha: 1, y: 0, duration: .65 }, .34)
    .to('.hero__right', { autoAlpha: 1, y: 0, scale: 1, duration: 1.15, ease: 'power2.out' }, .1)
    .to('.hero__stats__inner, .hero__scroll', { autoAlpha: 1, y: 0, duration: .75, stagger: .06 }, .4);

  if (ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach((element) => {
      if (hero && hero.contains(element)) return;
      // Anchor targets retain their geometry throughout navigation. Elements
      // already above the fold stay visible on deep links and restored pages.
      if (element.getBoundingClientRect().top < window.innerHeight * .92) return;
      const rowDelay = () => {
        if (window.innerWidth <= 768) return 0;
        const top = element.offsetTop;
        const row = [...element.parentElement.children].filter(sibling =>
          sibling.classList.contains('reveal') && Math.abs(sibling.offsetTop - top) < 4);
        return Math.max(0, row.indexOf(element)) * .065;
      };
      element.classList.add('is-revealing');
      const tween = gsap.fromTo(element, { autoAlpha: 0, y: element.id ? 0 : compact ? 10 : 20 }, {
        autoAlpha: 1,
        y: 0,
        duration: compact ? .55 : .8,
        delay: rowDelay(),
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility',
        onComplete: () => element.classList.remove('is-revealing'),
        scrollTrigger: {
          trigger: element,
          start: 'top 92%',
          once: true,
        },
      });
      revealTweens.push(tween);
    });
  }

  const respectMotionPreference = () => {
    if (!reducedMotion.matches) return;
    timeline.progress(1).kill();
    revealTweens.forEach(tween => {
      tween.scrollTrigger?.kill();
      tween.progress(1).kill();
    });
    gsap.set(entranceElements + ', .reveal', { clearProps: 'transform,opacity,visibility' });
    document.querySelectorAll('.is-revealing').forEach(element => element.classList.remove('is-revealing'));
    window.clearTimeout(window.heroIntroFailsafe);
    document.documentElement.classList.remove('hero-intro-pending');
  };
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener('change', respectMotionPreference);
  } else {
    reducedMotion.addListener(respectMotionPreference);
  }

  window.clearTimeout(window.heroIntroFailsafe);
  document.documentElement.classList.remove('hero-intro-pending');
}
