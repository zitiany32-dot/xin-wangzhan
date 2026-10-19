import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

gsap.registerPlugin(ScrollTrigger);

/* ============ LENIS ============ */
const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) {
      e.preventDefault();
      lenis.scrollTo(id, { offset: -20, duration: 1.4 });
    }
  });
});

/* ============ THREE — REAL SPARK PHYSICS ============
   Inspired by bruno-simon/folio-2019: a living 3D world layer driven by
   physics (ballistics + life cycles), not linear tweens. Sparks arc under
   gravity, cool from white-hot to dark as they die — like the real thing. */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0908, 0.05);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.6, 11);
scene.environment = new RoomEnvironment();

const key = new THREE.DirectionalLight(0xffd9b0, 2.2); key.position.set(5, 8, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xff5a00, 3.4); rim.position.set(-6, -2, -4); scene.add(rim);
scene.add(new THREE.AmbientLight(0x2c241c, 1.4));

/* soft-glow sprite baked on canvas: bright core + halo = cheap bloom */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,240,210,0.95)');
  grad.addColorStop(0.32, 'rgba(255,150,40,0.45)');
  grad.addColorStop(0.65, 'rgba(255,80,0,0.12)');
  grad.addColorStop(1.0, 'rgba(255,60,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = glowTexture();

/* ---- system 1: ballistic spark bursts (the money shot) ---- */
const isMobile = innerWidth < 760;
const N = isMobile ? 260 : 650;
const sPos = new Float32Array(N * 3);
const sVel = new Float32Array(N * 3);
const sCol = new Float32Array(N * 3);
const sLife = new Float32Array(N);      // age
const sMax = new Float32Array(N);       // lifespan
const sSize = new Float32Array(N);

const HOT = new THREE.Color(0xfff6e8), MID = new THREE.Color(0xff8a1e),
      COOL = new THREE.Color(0xb73a00), DEAD = new THREE.Color(0x000000);
const tmpC = new THREE.Color();

function spawn(i, burst) {
  // origin: bottom band of the frame, like grinding spray
  sPos[i*3]   = (Math.random() - 0.5) * (burst ? 14 : 22);
  sPos[i*3+1] = -6.5 + Math.random() * 2.5;
  sPos[i*3+2] = -2 - Math.random() * 7;
  const sp = burst ? 2.2 + Math.random() * 4.2 : 0.6 + Math.random() * 1.6;
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;   // mostly upward cone
  sVel[i*3]   = Math.cos(ang) * sp * (0.4 + Math.random() * 0.6);
  sVel[i*3+1] = Math.abs(Math.sin(ang)) * sp;
  sVel[i*3+2] = (Math.random() - 0.5) * 1.2;
  sLife[i] = Math.random() * 0.4;                            // stagger
  sMax[i] = 0.9 + Math.random() * 1.8;
  sSize[i] = 0.5 + Math.random() * 1.6;
}
for (let i = 0; i < N; i++) spawn(i, Math.random() < 0.55);

const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const sparkMat = new THREE.PointsMaterial({
  size: 0.34, map: glowTex, vertexColors: true, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
});
scene.add(new THREE.Points(sparkGeo, sparkMat));

/* ---- system 2: slow ambient embers ---- */
const M = isMobile ? 60 : 160;
const ePos = new Float32Array(M * 3), eSpd = new Float32Array(M);
for (let i = 0; i < M; i++) {
  ePos[i*3] = (Math.random() - 0.5) * 24; ePos[i*3+1] = (Math.random() - 0.5) * 13;
  ePos[i*3+2] = -3 - Math.random() * 8; eSpd[i] = 0.15 + Math.random() * 0.5;
}
const emberGeo = new THREE.BufferGeometry();
emberGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
  size: 0.16, map: glowTex, color: 0xff7a1e, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false
}));
scene.add(embers);

/* ---- the product: one hex bolt, floating in the spray ---- */
const steel = new THREE.MeshStandardMaterial({ color: 0xc4c9d1, metalness: 0.95, roughness: 0.3 });
const darkSteel = new THREE.MeshStandardMaterial({ color: 0x777d85, metalness: 0.9, roughness: 0.42 });
const bolt = new THREE.Group();
const head = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.95, 6), steel);
head.position.y = 2.05; bolt.add(head);
const wFace = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.26, 32), darkSteel);
wFace.position.y = 1.45; bolt.add(wFace);
const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 3.3, 32), steel);
shank.position.y = -0.35; bolt.add(shank);
for (let i = 0; i < 9; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.07, 12, 40), darkSteel);
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.1 - i * 0.185; bolt.add(ring);
}
const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.48, 0.38, 32), darkSteel);
tip.position.y = -2.18; bolt.add(tip);
bolt.rotation.set(0.28, 0, 0.52);
bolt.position.set(3.1, 0.4, -0.5);
scene.add(bolt);

/* ---- pointer ---- */
let mx = 0, my = 0;
addEventListener('pointermove', e => {
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
});

/* ---- loop ---- */
const clock = new THREE.Clock();
const GRAV = 3.4;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // sparks: ballistics + cooling ramp
  const p = sparkGeo.attributes.position.array, c = sparkGeo.attributes.color.array;
  for (let i = 0; i < N; i++) {
    sLife[i] += dt;
    if (sLife[i] >= sMax[i]) { spawn(i, Math.random() < 0.6); continue; }
    sVel[i*3+1] -= GRAV * dt * (0.55 + sSize[i] * 0.2);       // gravity
    sVel[i*3] *= (1 - 0.35 * dt); sVel[i*3+2] *= (1 - 0.35 * dt); // drag
    p[i*3] += sVel[i*3] * dt; p[i*3+1] += sVel[i*3+1] * dt; p[i*3+2] += sVel[i*3+2] * dt;
    if (p[i*3+1] < -7.5) { spawn(i, true); continue; }
    // cooling: white-hot -> orange -> dark -> gone (additive => black = invisible)
    const k = sLife[i] / sMax[i];
    if (k < 0.18) tmpC.copy(HOT).lerp(MID, k / 0.18);
    else if (k < 0.55) tmpC.copy(MID).lerp(COOL, (k - 0.18) / 0.37);
    else tmpC.copy(COOL).lerp(DEAD, (k - 0.55) / 0.45);
    const flick = 0.82 + 0.18 * Math.sin(t * 47 + i * 2.39);
    c[i*3] = tmpC.r * flick; c[i*3+1] = tmpC.g * flick; c[i*3+2] = tmpC.b * flick;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;

  // embers drift up
  const ep = emberGeo.attributes.position.array;
  for (let i = 0; i < M; i++) {
    ep[i*3+1] += eSpd[i] * dt;
    ep[i*3] += Math.sin(t * 0.6 + i) * 0.12 * dt;
    if (ep[i*3+1] > 7) { ep[i*3+1] = -7; ep[i*3] = (Math.random() - 0.5) * 24; }
  }
  emberGeo.attributes.position.needsUpdate = true;

  // bolt: slow tumble + breath
  bolt.rotation.y = t * 0.3;
  bolt.position.y = 0.4 + Math.sin(t * 0.65) * 0.3;

  // camera: pointer parallax (the "explorable" feel)
  camera.position.x += (mx * 1.5 - camera.position.x) * 0.045;
  camera.position.y += ((0.6 - my * 1.0) - camera.position.y) * 0.045;
  camera.lookAt(0.7, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* scroll journey: the bolt dives away as you leave the hero;
   spark layer thins but never fully leaves — embers everywhere */
gsap.to(bolt.position, { z: -8, y: -3, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
gsap.to(bolt.rotation, { x: 1.25, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
gsap.to('#gl', { opacity: 0.42, scrollTrigger: { trigger: '#stats', start: 'top bottom', end: 'top 25%', scrub: 1 } });

/* ============ PRELOADER (waits for video) ============ */
const preFill = document.getElementById('preFill'), prePct = document.getElementById('prePct');
const video = document.querySelector('.hero-video');
let pv = 0, videoReady = false;
if (video) {
  video.addEventListener('canplaythrough', () => { videoReady = true; }, { once: true });
  setTimeout(() => { videoReady = true; }, 5000); // never trap the user
}
const preTimer = setInterval(() => {
  const target = videoReady ? 100 : 82;
  pv += (target - pv) * 0.12 + 0.6;
  if (pv >= 99.4 && videoReady) pv = 100;
  preFill.style.width = Math.min(pv, 100) + '%';
  prePct.textContent = String(Math.floor(Math.min(pv, 100))).padStart(2, '0');
  if (pv >= 100) { clearInterval(preTimer); setTimeout(() => document.getElementById('preloader').classList.add('done'), 300); }
}, 120);

/* ============ SCROLL CHOREOGRAPHY ============ */
document.querySelectorAll('.reveal').forEach(el => {
  gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' } });
});

document.querySelectorAll('.count').forEach(el => {
  const to = +el.dataset.to;
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to({ v: 0 }, { v: to, duration: 2, ease: 'power2.out',
      onUpdate: function(){ el.textContent = Math.floor(this.targets()[0].v).toLocaleString('en-US'); } }) });
});

const track = document.getElementById('processTrack');
gsap.to(track, { x: () => -(track.scrollWidth - innerWidth + 90), ease: 'none',
  scrollTrigger: { trigger: '.process', start: 'top top',
    end: () => '+=' + (track.scrollWidth - innerWidth + 300),
    pin: '.process-pin', scrub: 1, invalidateOnRefresh: true,
    onUpdate: self => document.getElementById('processFill').style.transform = `scaleX(${self.progress})` } });

document.querySelectorAll('.sail-row').forEach(row => {
  const bar = row.querySelector('.bar i');
  ScrollTrigger.create({ trigger: row, start: 'top 92%', once: true,
    onEnter: () => bar.style.width = getComputedStyle(bar).getPropertyValue('--w') });
});

const mt = document.getElementById('marqueeTrack');
mt.innerHTML += mt.innerHTML;

/* ============ CURSOR ============ */
const dot = document.getElementById('cursorDot'), ring = document.getElementById('cursorRing');
let cx = 0, cy = 0, rx = 0, ry = 0;
addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; });
(function cur(){ rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
  dot.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
  ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  requestAnimationFrame(cur); })();
document.querySelectorAll('a, summary, .p-card, .proj').forEach(el => {
  el.addEventListener('pointerenter', () => document.body.classList.add('link-hover'));
  el.addEventListener('pointerleave', () => document.body.classList.remove('link-hover'));
});

addEventListener('load', () => ScrollTrigger.refresh());
