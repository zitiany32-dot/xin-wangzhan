import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

gsap.registerPlugin(ScrollTrigger);

/* ============ LENIS SMOOTH SCROLL ============ */
const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

/* anchor links via lenis */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) {
      e.preventDefault();
      lenis.scrollTo(id, { offset: -20, duration: 1.4 });
    }
  });
});

/* ============ THREE.JS — MOLTEN FORGE SCENE ============ */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0908, 0.055);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.6, 11);

scene.environment = new RoomEnvironment();
const key = new THREE.DirectionalLight(0xffb37a, 2.4); key.position.set(5, 8, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xff5a00, 3.2); rim.position.set(-6, -2, -4); scene.add(rim);
const fill = new THREE.AmbientLight(0x30281f, 1.2); scene.add(fill);

/* --- procedural hex bolt --- */
const steel = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, metalness: 0.95, roughness: 0.32 });
const darkSteel = new THREE.MeshStandardMaterial({ color: 0x6d7278, metalness: 0.9, roughness: 0.45 });
const bolt = new THREE.Group();

// hex head
const head = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 1.0, 6), steel);
head.position.y = 2.1; bolt.add(head);
// washer face under head
const washerFace = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.28, 32), darkSteel);
washerFace.position.y = 1.48; bolt.add(washerFace);
// shank
const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 3.4, 32), steel);
shank.position.y = -0.35; bolt.add(shank);
// thread rings
for (let i = 0; i < 9; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.075, 12, 40), darkSteel);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.15 - i * 0.19;
  bolt.add(ring);
}
// chamfer tip
const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.5, 0.4, 32), darkSteel);
tip.position.y = -2.25; bolt.add(tip);

bolt.rotation.z = 0.5; bolt.rotation.x = 0.25;
bolt.position.set(2.6, 0.2, 0);
scene.add(bolt);

/* --- floating hex nuts --- */
const nuts = [];
const nutGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.34, 6);
for (let i = 0; i < 14; i++) {
  const n = new THREE.Mesh(nutGeo, i % 2 ? steel : darkSteel);
  n.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, -3 - Math.random() * 6);
  n.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  n.userData = { rx: (Math.random() - 0.5) * 0.01, ry: (Math.random() - 0.5) * 0.014, fy: Math.random() * Math.PI * 2, fa: 0.25 + Math.random() * 0.4 };
  nuts.push(n); scene.add(n);
}

/* --- spark particles --- */
const SPARKS = 900;
const pos = new Float32Array(SPARKS * 3), vel = new Float32Array(SPARKS * 3), col = new Float32Array(SPARKS * 3);
const cA = new THREE.Color(0xff5a00), cB = new THREE.Color(0xffb300);
for (let i = 0; i < SPARKS; i++) {
  pos[i*3] = (Math.random() - 0.5) * 22;
  pos[i*3+1] = (Math.random() - 0.5) * 12;
  pos[i*3+2] = -4 - Math.random() * 8;
  vel[i*3] = (Math.random() - 0.5) * 0.02;
  vel[i*3+1] = 0.008 + Math.random() * 0.03;
  vel[i*3+2] = (Math.random() - 0.5) * 0.01;
  const c = Math.random() < 0.5 ? cA : cB;
  col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
}
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(sparks);

/* --- mouse parallax --- */
let mx = 0, my = 0;
addEventListener('pointermove', e => {
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
});

/* --- render loop --- */
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  bolt.rotation.y = t * 0.28;
  bolt.position.y = 0.2 + Math.sin(t * 0.7) * 0.28;
  nuts.forEach(n => {
    n.rotation.x += n.userData.rx; n.rotation.y += n.userData.ry;
    n.position.y += Math.sin(t * 0.8 + n.userData.fy) * 0.0016 * n.userData.fa * 10;
  });
  const p = sparkGeo.attributes.position.array;
  for (let i = 0; i < SPARKS; i++) {
    p[i*3] += vel[i*3]; p[i*3+1] += vel[i*3+1]; p[i*3+2] += vel[i*3+2];
    if (p[i*3+1] > 7) { p[i*3+1] = -7; p[i*3] = (Math.random() - 0.5) * 22; }
  }
  sparkGeo.attributes.position.needsUpdate = true;
  camera.position.x += ((mx * 1.4) - camera.position.x) * 0.045;
  camera.position.y += ((0.6 - my * 0.9) - camera.position.y) * 0.045;
  camera.lookAt(0.6, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* scroll-driven: bolt dives & scales as hero leaves */
gsap.to(bolt.position, { z: -7, y: -2.5, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
gsap.to(bolt.rotation, { x: 1.2, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
gsap.to('#gl', { opacity: 0.16, scrollTrigger: { trigger: '#stats', start: 'top bottom', end: 'top 30%', scrub: 1 } });

/* ============ PRELOADER ============ */
const preFill = document.getElementById('preFill'), prePct = document.getElementById('prePct');
let pv = 0;
const preTimer = setInterval(() => {
  pv = Math.min(100, pv + Math.random() * 22);
  preFill.style.width = pv + '%';
  prePct.textContent = String(Math.floor(pv)).padStart(2, '0');
  if (pv >= 100) { clearInterval(preTimer); setTimeout(() => document.getElementById('preloader').classList.add('done'), 350); }
}, 160);

/* ============ REVEALS ============ */
document.querySelectorAll('.reveal').forEach(el => {
  gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' } });
});

/* ============ COUNTERS ============ */
document.querySelectorAll('.count').forEach(el => {
  const to = +el.dataset.to;
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to({ v: 0 }, { v: to, duration: 2, ease: 'power2.out',
      onUpdate: function(){ el.textContent = Math.floor(this.targets()[0].v).toLocaleString('en-US'); } }) });
});

/* ============ HORIZONTAL PROCESS ============ */
const track = document.getElementById('processTrack');
const getX = () => -(track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingLeft) * 0);
gsap.to(track, { x: getX, ease: 'none',
  scrollTrigger: { trigger: '.process', start: 'top top', end: () => '+=' + (track.scrollWidth - innerWidth + 300),
    pin: '.process-pin', scrub: 1, invalidateOnRefresh: true,
    onUpdate: self => document.getElementById('processFill').style.transform = `scaleX(${self.progress})` } });

/* ============ SAIL BARS ============ */
document.querySelectorAll('.sail-row').forEach(row => {
  const bar = row.querySelector('.bar i');
  ScrollTrigger.create({ trigger: row, start: 'top 92%', once: true,
    onEnter: () => bar.style.width = getComputedStyle(bar).getPropertyValue('--w') });
});

/* ============ MARQUEE DUP ============ */
const mt = document.getElementById('marqueeTrack');
mt.innerHTML += mt.innerHTML;

/* ============ CUSTOM CURSOR ============ */
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

/* refresh triggers after fonts settle */
addEventListener('load', () => ScrollTrigger.refresh());
