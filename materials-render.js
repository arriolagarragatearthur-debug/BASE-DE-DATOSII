/* =========================================================
   RENDER DE MATERIALES POR SEMANA (unidades.html)
   - El listado de archivos es público: cualquiera que entre
     a la página (como tu profesor) los ve y descarga.
   - El formulario para subir/reemplazar solo aparece si hay
     un token de GitHub válido guardado en esta pestaña.
   ========================================================= */
(function () {
  const { ghGetToken, ghClearToken, ghUploadMaterial, ghListMaterial } = window.ghMaterials || {};
  if (!ghListMaterial) return; // github-upload.js no cargó

  const isAdmin = !!ghGetToken();

  // --- indicador de sesión en el topbar y en la cabecera ---
  const loginNavLink = document.getElementById('loginNavLink');
  const adminStatus = document.getElementById('adminStatus');
  if (isAdmin && loginNavLink) {
    loginNavLink.textContent = 'Cerrar sesión';
    loginNavLink.href = '#';
    loginNavLink.addEventListener('click', (e) => {
      e.preventDefault();
      ghClearToken();
      window.location.reload();
    });
  }
  if (isAdmin && adminStatus) {
    adminStatus.style.display = 'block';
    adminStatus.textContent = '🔓 Sesión de administrador activa — puedes subir o reemplazar material.';
  }

  // --- pinta una semana ---
  async function renderWeek(container) {
    const weekId = container.getAttribute('data-week');
    const files = await ghListMaterial(weekId);

    container.innerHTML = '';

    if (files.length) {
      const list = document.createElement('ul');
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0 0 12px';
      files.forEach(f => {
        const li = document.createElement('li');
        li.style.marginBottom = '6px';
        const a = document.createElement('a');
        a.href = f.download_url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = '📄 ' + f.name;
        a.style.color = 'var(--accent)';
        a.style.fontFamily = 'var(--font-mono)';
        a.style.fontSize = '.82rem';
        li.appendChild(a);
        list.appendChild(li);
      });
      container.appendChild(list);
    } else {
      const p = document.createElement('p');
      p.className = 'week-card__desc';
      p.textContent = 'Aún no se subió material para esta semana.';
      container.appendChild(p);
    }

    if (isAdmin) {
      const form = document.createElement('form');
      form.style.marginTop = '10px';
      form.style.borderTop = '1px solid var(--line-soft)';
      form.style.paddingTop = '12px';

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.style.fontSize = '.78rem';
      input.style.color = 'var(--text-muted)';
      input.style.marginBottom = '8px';
      input.style.display = 'block';

      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'btn btn--primary';
      btn.style.fontSize = '.62rem';
      btn.style.padding = '10px 14px';
      btn.textContent = '⬆ Subir PDF';

      const note = document.createElement('p');
      note.style.fontSize = '.75rem';
      note.style.marginTop = '8px';
      note.style.color = 'var(--text-muted)';

      form.appendChild(input);
      form.appendChild(btn);
      form.appendChild(note);
      container.appendChild(form);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = input.files[0];
        if (!file) { note.textContent = 'Elige un archivo primero.'; return; }
        btn.disabled = true;
        note.textContent = 'Subiendo...';
        try {
          await ghUploadMaterial(weekId, file);
          note.textContent = '¡Subido!';
          if (typeof playCoin === 'function') playCoin();
          renderWeek(container);
        } catch (err) {
          note.textContent = 'Error: ' + err.message;
          if (typeof playError === 'function') playError();
          btn.disabled = false;
        }
      });
    }
  }

  document.querySelectorAll('.week-file').forEach(renderWeek);
})();
