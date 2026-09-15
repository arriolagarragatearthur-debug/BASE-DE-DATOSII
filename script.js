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

/* =========================================================
   TEMA RETRO 8-BIT — chiptune, monedas y sonido de salto
   (todo el sonido es sintetizado con Web Audio API,
   no usa clips ni música de ningún videojuego con derechos de autor)
   ========================================================= */

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', gainValue = 0.05, startTime = 0) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
}

// blip corto al pasar por el menú
function playBlip() { playTone(660, 0.06, 'square', 0.035); }

// sonido de "salto" al hacer click en botones (barrido de frecuencia hacia arriba)
function playJump() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.18);
}

// sonido de "moneda" (dos tonos rápidos ascendentes)
function playCoin() {
  playTone(988, 0.09, 'square', 0.05, 0);
  playTone(1319, 0.15, 'square', 0.05, 0.08);
}

// pequeña fanfarria al abrir una unidad o iniciar sesión con éxito
function playFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.12, 'square', 0.04, i * 0.09));
}
function playError() { playTone(140, 0.3, 'sawtooth', 0.05); }

// --- chiptune de fondo: pequeño arpegio en bucle, original ---
let musicNodes = null;
let musicTimer = null;
function startMusic() {
  const ctx = getAudioCtx();
  const notes = [392, 523, 659, 523, 392, 523, 784, 659]; // melodía original, en bucle
  let step = 0;
  const gain = ctx.createGain();
  gain.gain.value = 0.028;
  gain.connect(ctx.destination);

  function playStep() {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = notes[step % notes.length];
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.028, ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(noteGain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    step++;
  }
  playStep();
  musicTimer = setInterval(playStep, 240);
  musicNodes = { gain };
}
function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  musicNodes = null;
}

// --- toggle de música, persistente entre páginas ---
const musicToggle = document.getElementById('musicToggle');
if (musicToggle) {
  const isOn = () => localStorage.getItem('chiptuneMusic') === 'on';
  const render = () => {
    musicToggle.textContent = isOn() ? '🎵' : '🔇';
    musicToggle.setAttribute('aria-pressed', isOn());
  };
  render();
  if (isOn()) {
    document.addEventListener('click', function startOnce() {
      startMusic();
      document.removeEventListener('click', startOnce);
    }, { once: true });
  }
  musicToggle.addEventListener('click', () => {
    if (isOn()) {
      localStorage.setItem('chiptuneMusic', 'off');
      stopMusic();
    } else {
      localStorage.setItem('chiptuneMusic', 'on');
      startMusic();
    }
    render();
  });
}

// --- puntaje de monedas, persistente entre páginas ---
const scoreEl = document.getElementById('score');
function getScore() { return parseInt(localStorage.getItem('coinScore') || '0', 10); }
function setScore(v) {
  localStorage.setItem('coinScore', v);
  if (scoreEl) scoreEl.textContent = v;
}
if (scoreEl) setScore(getScore());

document.querySelectorAll('.coin').forEach(coin => {
  coin.addEventListener('click', () => {
    if (coin.classList.contains('is-collected')) return;
    coin.classList.add('is-collected');
    playCoin();
    setScore(getScore() + 10);
  });
});

// --- enganchar sonidos a la interfaz existente ---
document.querySelectorAll('.menu__link').forEach(link => {
  link.addEventListener('mouseenter', playBlip);
});
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', playJump);
});
document.querySelectorAll('.unit-accordion').forEach(acc => {
  acc.querySelector('.unit-accordion__summary').addEventListener('click', playFanfare);
});
if (loginForm) {
  loginForm.addEventListener('submit', () => {
    if (typeof playJump === 'function') playJump();
  });
}

/* =========================================================
   INSIGNIA DE UNIDADES DESBLOQUEADAS (jugando el minijuego)
   Solo aplica en unidades.html, donde existen .unit-accordion
   ========================================================= */
const unitAccordionsForBadge = document.querySelectorAll('.unit-accordion');
if (unitAccordionsForBadge.length) {
  const unlockedUnits = JSON.parse(localStorage.getItem('unlockedUnits') || '[]');

  unitAccordionsForBadge.forEach((acc, i) => {
    if (unlockedUnits.includes(i + 1)) {
      const title = acc.querySelector('.unit-accordion__title');
      if (title && !title.querySelector('.unit-badge')) {
        const badge = document.createElement('span');
        badge.className = 'unit-badge';
        badge.textContent = '🏆 DESBLOQUEADA';
        title.appendChild(badge);
      }
    }
  });

  const pageHead = document.querySelector('.page-head');
  if (pageHead) {
    const progress = document.createElement('p');
    progress.className = 'game-progress';
    progress.innerHTML = `🎮 Progreso del juego: ${unlockedUnits.length}/4 unidades desbloqueadas — <a href="index.html#juego">jugar</a>`;
    pageHead.appendChild(progress);
  }
}
