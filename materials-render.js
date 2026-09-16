/* =========================================================
   RENDER DE MATERIALES POR SEMANA (unidades.html)
   - Cada semana tiene 4 actividades, cada una con su propio
     selector de archivo independiente (materials/{weekId}/a{n}/...).
   - El listado de archivos es público: cualquiera que entre
     a la página (como tu profesor) los ve y descarga, con o sin
     sesión de administrador iniciada.
   - El formulario para subir/reemplazar/eliminar solo aparece
     si hay un token de GitHub válido guardado en esta pestaña.
   - Las semanas se cargan de una en una, solo cuando abres esa
     unidad, para no gastar de golpe el límite de peticiones
     gratuitas de GitHub.
   ========================================================= */
(function () {
  const { ghGetToken, ghClearToken, ghUploadMaterial, ghListMaterial, ghDeleteMaterial } = window.ghMaterials || {};
  if (!ghListMaterial) return; // github-upload.js no cargó

  const isAdmin = !!ghGetToken();
  const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.gif,.webp';
  const ACTIVITIES_PER_WEEK = 4;

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
    if (isImage(file.name)) {
      body.innerHTML = `<img src="${file.download_url}" alt="${file.name}">`;
    } else if (extOf(file.name) === 'pdf') {
      // GitHub sirve los PDF sin el encabezado "Content-Type: application/pdf",
      // así que el navegador no los dibuja dentro de un <iframe> normal (se ve
      // en negro). Usamos el visor de PDF.js, que descarga el archivo por su
      // cuenta y sí sabe renderizarlo.
      const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(file.download_url)}`;
      body.innerHTML = `<iframe src="${viewerUrl}" title="${file.name}"></iframe>`;
    } else {
      body.innerHTML = `<iframe src="${file.download_url}" title="${file.name}"></iframe>`;
    }
    modal.hidden = false;
  }
  function closeModal() {
    modal.hidden = true;
    document.getElementById('materialModalBody').innerHTML = '';
  }

  // --- pinta una actividad (lista de archivos + formulario admin) ---
  async function renderSlot(container, slotId) {
    const files = await ghListMaterial(slotId);

    container.innerHTML = '';

    if (files === null) {
      const p = document.createElement('p');
      p.className = 'week-card__desc';
      p.textContent = '⚠️ Límite de solicitudes a GitHub alcanzado. Espera unos minutos y recarga.';
      container.appendChild(p);
    } else if (files.length) {
      const list = document.createElement('ul');
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0 0 10px';
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
              renderSlot(container, slotId);
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
      p.style.margin = '0 0 8px';
      p.textContent = 'Aún no se subió material.';
      container.appendChild(p);
    }

    if (isAdmin) {
      const form = document.createElement('form');
      form.style.marginTop = '6px';

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ACCEPTED;
      input.multiple = true;
      input.style.fontSize = '.75rem';
      input.style.color = 'var(--text-muted)';
      input.style.marginBottom = '8px';
      input.style.display = 'block';

      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'btn btn--primary';
      btn.style.fontSize = '.6rem';
      btn.style.padding = '8px 12px';
      btn.textContent = '⬆ Subir archivos';

      const note = document.createElement('p');
      note.style.fontSize = '.72rem';
      note.style.marginTop = '6px';
      note.style.color = 'var(--text-muted)';

      form.appendChild(input);
      form.appendChild(btn);
      form.appendChild(note);
      container.appendChild(form);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = Array.from(input.files);
        if (!files.length) { note.textContent = 'Elige uno o más archivos primero.'; return; }
        btn.disabled = true;

        let uploaded = 0;
        const failed = [];
        for (const file of files) {
          note.textContent = `Subiendo ${uploaded + failed.length + 1} de ${files.length}: ${file.name}...`;
          try {
            await ghUploadMaterial(slotId, file);
            uploaded++;
          } catch (err) {
            failed.push(`${file.name}: ${err.message}`);
          }
        }

        if (failed.length) {
          note.textContent = `Se subieron ${uploaded} de ${files.length}. Errores — ${failed.join(' · ')}`;
          if (typeof playError === 'function') playError();
        } else {
          note.textContent = `¡${uploaded} archivo(s) subido(s)!`;
          if (typeof playCoin === 'function') playCoin();
        }

        renderSlot(container, slotId);
      });
    }
  }

  // --- pinta las 4 actividades de una semana ---
  function renderWeek(weekContainer) {
    const weekId = weekContainer.getAttribute('data-week');
    weekContainer.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'activity-list';

    for (let i = 1; i <= ACTIVITIES_PER_WEEK; i++) {
      const slotId = `${weekId}/a${i}`;

      const block = document.createElement('div');
      block.className = 'activity-block';

      const title = document.createElement('p');
      title.className = 'activity-block__title';
      title.textContent = `Actividad ${i}`;
      block.appendChild(title);

      const slotContainer = document.createElement('div');
      block.appendChild(slotContainer);

      list.appendChild(block);
      renderSlot(slotContainer, slotId);
    }

    weekContainer.appendChild(list);
  }

  // --- carga perezosa: solo se piden a GitHub las semanas de la
  //     unidad que está abierta, y solo la primera vez que se abre ---
  function renderUnitWeeks(details) {
    details.querySelectorAll('.week-file').forEach(container => {
      if (container.dataset.ghLoaded) return;
      container.dataset.ghLoaded = '1';
      renderWeek(container);
    });
  }

  document.querySelectorAll('.unit-accordion').forEach(details => {
    if (details.open) renderUnitWeeks(details);
    details.addEventListener('toggle', () => {
      if (details.open) renderUnitWeeks(details);
    });
  });
})();
