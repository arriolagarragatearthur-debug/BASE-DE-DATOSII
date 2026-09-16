/* =========================================================
   SUBIDA DE MATERIAL A TRAVÉS DE LA API DE GITHUB
   Guarda los archivos directamente en tu repositorio.
   El token se pega en el login y solo vive en esta pestaña
   (sessionStorage) — nunca se guarda en el código ni se sube
   al repositorio.
   ========================================================= */

// ⚠️ CAMBIA ESTOS DOS VALORES POR LOS TUYOS
const GITHUB_OWNER  = 'arriolagarragatearthur-debug';
const GITHUB_REPO   = 'BASE-DE-DATOSII';
const GITHUB_BRANCH = 'main';

// tiempo máximo que se espera una respuesta de GitHub antes de
// avisar con un error en vez de quedarse "congelado" para siempre
const GH_TIMEOUT_MS = 15000;

function ghFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function ghGetToken() {
  return sessionStorage.getItem('ghToken');
}
function ghSetToken(token) {
  sessionStorage.setItem('ghToken', token);
}
function ghClearToken() {
  sessionStorage.removeItem('ghToken');
}

// comprueba que el token es válido y tiene acceso al repositorio
async function ghVerifyToken(token) {
  try {
    const res = await ghFetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('GitHub tardó demasiado en responder. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
    return false;
  }
}

// convierte un File a base64 (sin el prefijo "data:...;base64,")
function ghFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// sube (o reemplaza) un archivo en materials/{weekId}/{fileName}
async function ghUploadMaterial(weekId, file) {
  const token = ghGetToken();
  if (!token) throw new Error('No hay sesión activa.');

  const path = `materials/${weekId}/${file.name}`;
  const content = await ghFileToBase64(file);

  try {
    // si ya existe un archivo con ese nombre, hay que mandar su "sha" para reemplazarlo
    let sha;
    const existing = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
    }

    const res = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Subir material: ${path}`,
          content,
          branch: GITHUB_BRANCH,
          ...(sha ? { sha } : {})
        })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo subir el archivo.');
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('GitHub tardó demasiado en responder. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
    throw err;
  }
}

// lista los archivos ya subidos en materials/{weekId}/ — público, sin token,
// así cualquiera que entre a la página (como tu profesor) puede verlos y descargarlos
async function ghListMaterial(weekId) {
  try {
    const token = ghGetToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/materials/${weekId}?ref=${GITHUB_BRANCH}&_=${Date.now()}`,
      { cache: 'no-store', headers }
    );
    if (res.status === 403 || res.status === 429) return null; // límite de solicitudes de GitHub alcanzado
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// elimina un archivo en materials/{weekId}/{fileName}
async function ghDeleteMaterial(path, sha) {
  const token = ghGetToken();
  if (!token) throw new Error('No hay sesión activa.');

  try {
    const res = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Eliminar material: ${path}`,
          sha,
          branch: GITHUB_BRANCH
        })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo eliminar el archivo.');
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('GitHub tardó demasiado en responder. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
    throw err;
  }
}

window.ghMaterials = { ghGetToken, ghSetToken, ghClearToken, ghVerifyToken, ghUploadMaterial, ghListMaterial, ghDeleteMaterial };
