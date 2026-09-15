/* =========================================================
   SUBIDA DE MATERIAL A TRAVÉS DE LA API DE GITHUB
   Guarda los archivos directamente en tu repositorio.
   El token se pega en el login y solo vive en esta pestaña
   (sessionStorage) — nunca se guarda en el código ni se sube
   al repositorio.
   ========================================================= */

// ⚠️ CAMBIA ESTOS DOS VALORES POR LOS TUYOS
const GITHUB_OWNER  = 'TU_USUARIO_DE_GITHUB';
const GITHUB_REPO   = 'TU_REPOSITORIO';
const GITHUB_BRANCH = 'main';

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
    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch {
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

  // si ya existe un archivo con ese nombre, hay que mandar su "sha" para reemplazarlo
  let sha;
  const existing = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const res = await fetch(
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
}

// lista los archivos ya subidos en materials/{weekId}/ — público, sin token,
// así cualquiera que entre a la página (como tu profesor) puede verlos y descargarlos
async function ghListMaterial(weekId) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/materials/${weekId}?ref=${GITHUB_BRANCH}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

window.ghMaterials = { ghGetToken, ghSetToken, ghClearToken, ghVerifyToken, ghUploadMaterial, ghListMaterial };
