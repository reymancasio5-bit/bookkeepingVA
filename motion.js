const canvas = document.getElementById('heroScene');
const hero = document.querySelector('.hero');
const sculpture = document.querySelector('.hero__right');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function createOrbitalScene() {
  if (!canvas || !hero || !sculpture || reducedMotion.matches) return;
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
    let previousFrame = 0;
    let elapsed = 0;
    const draw = () => renderer.render(scene, camera);
    const canAnimate = () => inView && !document.hidden && !reducedMotion.matches && !contextLost;
    const animate = time => {
      animationFrame = 0;
      if (!canAnimate()) return;
      if (time - previousFrame >= 1000 / (mobile ? 24 : 30)) {
        elapsed += previousFrame ? Math.min((time - previousFrame) / 1000, .08) : 0;
        previousFrame = time;
        cage.rotation.y = elapsed * .09;
        assembly.rotation.y = Math.sin(elapsed * .13) * .13;
        assembly.rotation.x = .14 + Math.sin(elapsed * .17) * .04;
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
      previousFrame = 0;
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

  const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
  gsap.set('.hero__eyebrow, .hero__title, .hero__subtitle, .hero__ctas, .hero__right, .hero__stats__inner, .hero__scroll', {
    autoAlpha: 0,
    y: 18,
  });
  timeline
    .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 0.45 }, 0.08)
    .to('.hero__title', { autoAlpha: 1, y: 0, duration: 0.62 }, 0.16)
    .to('.hero__subtitle', { autoAlpha: 1, y: 0, duration: 0.5 }, 0.34)
    .to('.hero__ctas', { autoAlpha: 1, y: 0, duration: 0.45 }, 0.48)
    .to('.hero__right, .hero__stats__inner, .hero__scroll', { autoAlpha: 1, y: 0, duration: 0.62 }, 0.2);

  if (ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach((element) => {
      if (hero && hero.contains(element)) return;
      gsap.fromTo(element, { y: 16 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 88%',
          once: true,
        },
      });
    });
  }

  const respectMotionPreference = () => {
    if (!reducedMotion.matches) return;
    timeline.progress(1);
    if (ScrollTrigger) {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    }
    gsap.set('.reveal', { clearProps: 'all' });
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
