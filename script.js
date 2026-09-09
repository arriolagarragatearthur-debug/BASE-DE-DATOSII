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

// Resaltar el enlace activo según la sección visible
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.menu__link[href^="#"]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.remove('is-active'));
      const active = document.querySelector(`.menu__link[href="#${entry.target.id}"]`);
      if (active) active.classList.add('is-active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(section => observer.observe(section));

// Formulario de "Iniciar sesión" (solo demostrativo, sin backend)
const loginForm = document.getElementById('loginForm');
const loginNote = document.getElementById('loginNote');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginNote.textContent = 'Este formulario es una demostración: aún no está conectado a un servidor.';
});
