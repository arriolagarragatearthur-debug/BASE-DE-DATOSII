// Año automático en el pie de página
document.getElementById('year').textContent = new Date().getFullYear();

// Menú móvil
const menuToggle = document.getElementById('menuToggle');
const menu = document.querySelector('.menu');

menuToggle.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', isOpen);
});

// Cerrar el menú móvil al elegir una sección
document.querySelectorAll('.menu__link').forEach(link => {
  link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// Formulario de "Iniciar sesión" (solo demostrativo, sin backend)
const loginForm = document.getElementById('loginForm');
const loginNote = document.getElementById('loginNote');

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginNote.textContent = 'Este formulario es una demostración: aún no está conectado a un servidor.';
  });
}

/* =========================================================
   AMBIENTE INTERACTIVO — niebla, flicker, VHS y sonido
   (todo el sonido es sintetizado con Web Audio API,
   no usa clips ni archivos de audio con derechos de autor)
   ========================================================= */

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', gainValue = 0.05) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playBlip() { playTone(740, 0.08, 'square', 0.03); }
function playThud() { playTone(90, 0.25, 'sine', 0.12); }
function playCrackle() {
  const ctx = getAudioCtx();
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  noise.connect(gain).connect(ctx.destination);
  noise.start();
}
function playConfirm() { playTone(523, 0.12, 'sine', 0.05); setTimeout(() => playTone(784, 0.15, 'sine', 0.05), 90); }
function playError() { playTone(160, 0.3, 'sawtooth', 0.06); }

let ambientNodes = null;
function startAmbient() {
  const ctx = getAudioCtx();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const masterGain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.value = 55;
  osc2.type = 'sine';
  osc2.frequency.value = 55.6;
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 4;
  masterGain.gain.value = 0.0001;

  lfo.connect(lfoGain).connect(osc2.frequency);
  osc1.connect(masterGain);
  osc2.connect(masterGain);
  masterGain.connect(ctx.destination);

  osc1.start(); osc2.start(); lfo.start();
  masterGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.2);

  ambientNodes = { osc1, osc2, lfo, masterGain };
}
function stopAmbient() {
  if (!ambientNodes) return;
  const ctx = getAudioCtx();
  ambientNodes.masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  setTimeout(() => {
    ambientNodes.osc1.stop(); ambientNodes.osc2.stop(); ambientNodes.lfo.stop();
    ambientNodes = null;
  }, 700);
}

const ambientToggle = document.getElementById('ambientToggle');
if (ambientToggle) {
  const isOn = () => localStorage.getItem('ambientSound') === 'on';
  const render = () => {
    ambientToggle.textContent = isOn() ? '🔊' : '🔇';
    ambientToggle.setAttribute('aria-pressed', isOn());
  };
  render();
  if (isOn()) {
    document.addEventListener('click', function startOnce() {
      startAmbient();
      document.removeEventListener('click', startOnce);
    }, { once: true });
  }
  ambientToggle.addEventListener('click', () => {
    if (isOn()) {
      localStorage.setItem('ambientSound', 'off');
      stopAmbient();
    } else {
      localStorage.setItem('ambientSound', 'on');
      startAmbient();
    }
    render();
  });
}

document.querySelectorAll('.menu__link').forEach(link => {
  link.addEventListener('mouseenter', playBlip);
});
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', playThud);
});
document.querySelectorAll('.unit-accordion').forEach(acc => {
  acc.querySelector('.unit-accordion__summary').addEventListener('click', playCrackle);
});
if (loginForm) {
  loginForm.addEventListener('submit', () => {
    const filled = loginForm.usuario.value && loginForm.clave.value;
    filled ? playConfirm() : playError();
  });
}

document.querySelectorAll('.flicker-text').forEach(el => {
  el.classList.add('flicker-init');
  setInterval(() => {
    if (Math.random() < 0.12) {
      el.classList.add('flicker-glitch');
      setTimeout(() => el.classList.remove('flicker-glitch'), 160);
    }
  }, 1400);
});
