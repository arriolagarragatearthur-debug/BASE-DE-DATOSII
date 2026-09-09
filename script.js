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
