import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('heroScene');
const hero = document.querySelector('.hero');
const motionControl = document.getElementById('heroMotionControl');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function createOrbitalScene() {
  if (!(canvas instanceof HTMLCanvasElement) || !hero || window.innerWidth < 769) return null;

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.innerWidth >= 1024,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.z = 10;

    const globe = new THREE.Group();
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0xdcebdc, 1.15));

    const glow = new THREE.PointLight(0xb8f0ae, 18, 8);
    glow.position.set(0, 0, 1.8);
    scene.add(glow);

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x678e62,
      emissive: 0x385b37,
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.14,
      transparent: true,
      opacity: 0.34,
    });
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 24), coreMaterial));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xc9efa5,
      transparent: true,
      opacity: 0.62,
    });
    const radius = 1.58;
    const segments = 72;

    for (let latitude = -70; latitude <= 70; latitude += 20) {
      const angle = THREE.MathUtils.degToRad(latitude);
      const points = [];
      for (let step = 0; step < segments; step += 1) {
        const longitude = (step / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          radius * Math.cos(angle) * Math.cos(longitude),
          radius * Math.sin(angle),
          radius * Math.cos(angle) * Math.sin(longitude),
        ));
      }
      globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }

    for (let longitude = 0; longitude < 180; longitude += 20) {
      const angle = THREE.MathUtils.degToRad(longitude);
      const points = [];
      for (let step = 0; step <= segments; step += 1) {
        const latitude = -Math.PI / 2 + (step / segments) * Math.PI;
        points.push(new THREE.Vector3(
          radius * Math.cos(latitude) * Math.cos(angle),
          radius * Math.sin(latitude),
          radius * Math.cos(latitude) * Math.sin(angle),
        ));
      }
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }

    const orbits = [];
    [
      [2.08, 0.74, 0.22, 0.66],
      [1.98, 0.62, -0.86, -0.24],
      [1.86, 0.56, 0.94, -0.42],
    ].forEach(([xRadius, yRadius, rotateX, rotateY], index) => {
      const curve = new THREE.EllipseCurve(0, 0, xRadius, yRadius, 0, Math.PI * 2);
      const orbit = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(96).map(point => new THREE.Vector3(point.x, point.y, 0))),
        new THREE.LineBasicMaterial({
          color: index === 1 ? 0xe0f3b5 : 0xa9d79a,
          transparent: true,
          opacity: 0.68,
        }),
      );
      orbit.rotation.set(rotateX, rotateY, index * 0.48);
      globe.add(orbit);
      orbits.push(orbit);
    });

    const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f3b5 });
    const satellites = [];
    for (let index = 0; index < 3; index += 1) {
      const satellite = new THREE.Mesh(
        new THREE.SphereGeometry(index === 0 ? 0.065 : 0.045, 12, 10),
        satelliteMaterial,
      );
      satellite.position.set(Math.cos(index * 2.1) * 2, Math.sin(index * 2.1) * 0.72, 0.2);
      globe.add(satellite);
      satellites.push(satellite);
    }

    const resize = () => {
      const { width, height } = hero.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      globe.position.set(width < 1024 ? 1.6 : 2.15, 0, 0);
      globe.scale.setScalar(width < 1024 ? 0.78 : 1);
      if (inView) renderer.render(scene, camera);
    };

    let inView = false;
    let userPaused = false;
    let animationFrame = 0;
    let previousFrame = 0;
    let elapsed = 0;

    const draw = () => renderer.render(scene, camera);
    const animate = (time) => {
      animationFrame = 0;
      if (!inView || document.hidden || reducedMotion.matches || userPaused) return;
      if (time - previousFrame < 1000 / 30) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }
      const delta = previousFrame ? Math.min((time - previousFrame) / 1000, 0.05) : 0;
      previousFrame = time;
      elapsed += delta;
      globe.rotation.y = Math.sin(elapsed * 0.16) * 0.12;
      globe.rotation.x = Math.sin(elapsed * 0.11) * 0.045;
      satellites.forEach((satellite, index) => {
        const angle = elapsed * 0.12 + index * 2.1;
        satellite.position.set(Math.cos(angle) * 2, Math.sin(angle) * 0.72, 0.2);
      });
      draw();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const updateAnimation = () => {
      if (reducedMotion.matches || document.hidden || !inView || userPaused) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        if (inView) draw();
      } else if (!animationFrame) {
        previousFrame = 0;
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAnimation();
    });
    observer.observe(hero);

    motionControl.hidden = reducedMotion.matches;
    motionControl.addEventListener('click', () => {
      userPaused = !userPaused;
      motionControl.setAttribute('aria-pressed', String(userPaused));
      motionControl.querySelector('i').className = userPaused ? 'fas fa-play' : 'fas fa-pause';
      motionControl.querySelector('span').textContent = userPaused ? 'Resume animation' : 'Pause animation';
      updateAnimation();
    });

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', updateAnimation);
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener('change', () => {
        motionControl.hidden = reducedMotion.matches;
        updateAnimation();
      });
    } else {
      reducedMotion.addListener(() => {
        motionControl.hidden = reducedMotion.matches;
        updateAnimation();
      });
    }

    resize();
    hero.classList.add('has-webgl');
    if (inView) updateAnimation();
    return { globe };
  } catch (error) {
    console.error('The Three.js orbital sculpture could not be initialized.', error);
    return null;
  }
}

const scene = createOrbitalScene();
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
  if (scene) {
    gsap.set(scene.globe.scale, { x: 0.9, y: 0.9, z: 0.9 });
    timeline.to(scene.globe.scale, { x: 1, y: 1, z: 1, duration: 1 }, 0);
    timeline.fromTo('.hero__canvas', { opacity: 0.02 }, {
      opacity: 0.42,
      duration: 0.65,
    }, 0);
  }

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
      gsap.fromTo(element, { autoAlpha: 0, y: 24 }, {
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
