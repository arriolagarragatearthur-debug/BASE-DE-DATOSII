/* =========================================================
   RENDER DE MATERIALES POR SEMANA (unidades.html)
   - El listado de archivos es público: cualquiera que entre
     a la página (como tu profesor) los ve y descarga.
   - El formulario para subir/reemplazar/eliminar solo aparece
     si hay un token de GitHub válido guardado en esta pestaña.
   ========================================================= */
(function () {
  const { ghGetToken, ghClearToken, ghUploadMaterial, ghListMaterial, ghDeleteMaterial } = window.ghMaterials || {};
  if (!ghListMaterial) return; // github-upload.js no cargó

  const isAdmin = !!ghGetToken();
  const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.gif,.webp';

  function extOf(name) {
    return (name.split('.').pop() || '').toLowerCase();
  }
  function isImage(name) {
    return IMAGE_EXT.includes(extOf(name));
  }

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
    adminStatus.textContent = '🔓 Sesión de administrador activa — puedes subir, reemplazar o eliminar material.';
  }

  // --- visor emergente (modal) compartido por toda la página ---
  let modal = document.getElementById('materialModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'materialModal';
    modal.className = 'material-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="material-modal__panel">
        <div class="material-modal__bar">
          <span id="materialModalName"></span>
          <button type="button" class="material-modal__close" id="materialModalClose" aria-label="Cerrar">✕</button>
        </div>
        <div class="material-modal__body" id="materialModalBody"></div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('materialModalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }
  function openModal(file) {
    const body = document.getElementById('materialModalBody');
    document.getElementById('materialModalName').textContent = file.name;
    body.innerHTML = isImage(file.name)
      ? `<img src="${file.download_url}" alt="${file.name}">`
      : `<iframe src="${file.download_url}" title="${file.name}"></iframe>`;
    modal.hidden = false;
  }
  function closeModal() {
    modal.hidden = true;
    document.getElementById('materialModalBody').innerHTML = '';
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
        li.className = 'material-item';

        const icon = document.createElement('span');
        icon.className = 'material-item__icon';
        icon.textContent = isImage(f.name) ? '🖼️' : '📄';

        const name = document.createElement('span');
        name.className = 'material-item__name';
        name.textContent = f.name;
        name.title = f.name;

        const actions = document.createElement('span');
        actions.className = 'material-item__actions';

        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'icon-btn';
        viewBtn.title = 'Ver';
        viewBtn.setAttribute('aria-label', 'Ver ' + f.name);
        viewBtn.textContent = '👁️';
        viewBtn.addEventListener('click', () => openModal(f));

        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'icon-btn';
        downloadBtn.title = 'Descargar';
        downloadBtn.setAttribute('aria-label', 'Descargar ' + f.name);
        downloadBtn.href = f.download_url;
        downloadBtn.download = f.name;
        downloadBtn.target = '_blank';
        downloadBtn.rel = 'noopener';
        downloadBtn.textContent = '⬇️';

        actions.appendChild(viewBtn);
        actions.appendChild(downloadBtn);

        if (isAdmin) {
          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'icon-btn icon-btn--danger';
          deleteBtn.title = 'Eliminar';
          deleteBtn.setAttribute('aria-label', 'Eliminar ' + f.name);
          deleteBtn.textContent = '🗑️';
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`¿Eliminar "${f.name}"? Esta acción no se puede deshacer.`)) return;
            deleteBtn.disabled = true;
            try {
              await ghDeleteMaterial(f.path, f.sha);
              if (typeof playCoin === 'function') playCoin();
              renderWeek(container);
            } catch (err) {
              alert('Error al eliminar: ' + err.message);
              deleteBtn.disabled = false;
            }
          });
          actions.appendChild(deleteBtn);
        }

        li.appendChild(icon);
        li.appendChild(name);
        li.appendChild(actions);
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
      input.accept = ACCEPTED;
      input.style.fontSize = '.78rem';
      input.style.color = 'var(--text-muted)';
      input.style.marginBottom = '8px';
      input.style.display = 'block';

      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'btn btn--primary';
      btn.style.fontSize = '.62rem';
      btn.style.padding = '10px 14px';
      btn.textContent = '⬆ Subir archivo (PDF o imagen)';

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
