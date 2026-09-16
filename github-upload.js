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

/* =========================================================
   CACHÉ DEL ÁRBOL COMPLETO DEL REPOSITORIO
   La API pública de GitHub sin autenticar permite solo 60
   solicitudes por hora por IP. Antes, CADA actividad de CADA
   semana pedía su propia lista (hasta 64 llamadas si se abrían
   las 4 unidades), así que el límite se agotaba casi al abrir
   la página. Ahora se pide el árbol del repositorio completo
   UNA sola vez y se reutiliza para listar cualquier semana o
   actividad, así que una visita normal gasta 1 sola solicitud
   en vez de decenas.
   Nota: el límite de 60/h lo impone GitHub del lado del servidor
   según la IP — no es algo que el código pueda "quitar" o volver
   ilimitado. Esta caché reduce el consumo real al mínimo posible
   sin backend propio, que sería la única forma de eliminarlo del
   todo.
   ========================================================= */
let ghTreeCache = null;
let ghTreePromise = null;
const GH_TREE_CACHE_KEY = 'ghTreeCacheV1';
const GH_TREE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function ghReadTreeSessionCache() {
  try {
    const raw = sessionStorage.getItem(GH_TREE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (Date.now() - parsed.ts) > GH_TREE_CACHE_TTL) return null;
    return parsed.tree;
  } catch {
    return null;
  }
}
function ghWriteTreeSessionCache(tree) {
  try {
    sessionStorage.setItem(GH_TREE_CACHE_KEY, JSON.stringify({ ts: Date.now(), tree }));
  } catch {
    /* si sessionStorage está lleno o bloqueado, simplemente no cachea entre recargas */
  }
}

// pide el árbol completo del repo en UNA sola llamada. Devuelve null si
// GitHub respondió con límite de solicitudes alcanzado.
async function ghGetTree(forceRefresh = false) {
  if (!forceRefresh && ghTreeCache) return ghTreeCache;
  if (!forceRefresh) {
    const cached = ghReadTreeSessionCache();
    if (cached) { ghTreeCache = cached; return cached; }
  }
  if (ghTreePromise) return ghTreePromise;

  const token = ghGetToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  ghTreePromise = (async () => {
    try {
      const res = await ghFetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`,
        { headers }
      );
      if (res.status === 403 || res.status === 429) return null;
      if (!res.ok) return [];
      const data = await res.json();
      const tree = Array.isArray(data.tree) ? data.tree : [];
      ghTreeCache = tree;
      ghWriteTreeSessionCache(tree);
      return tree;
    } catch {
      return [];
    } finally {
      ghTreePromise = null;
    }
  })();

  return ghTreePromise;
}

// se llama después de subir/eliminar un archivo para que el próximo listado
// no muestre datos viejos de la caché
function ghInvalidateTree() {
  ghTreeCache = null;
  try { sessionStorage.removeItem(GH_TREE_CACHE_KEY); } catch {}
}

function ghRawUrl(path) {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path.split('/').map(encodeURIComponent).join('/')}`;
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
    ghInvalidateTree();
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('GitHub tardó demasiado en responder. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
    throw err;
  }
}

// lista los archivos ya subidos en materials/{weekId}/ — público, sin token,
// así cualquiera que entre a la página (como tu profesor) puede verlos y descargarlos.
// Ya no hace una llamada a GitHub por cada actividad: reutiliza el árbol
// completo del repositorio (ver ghGetTree arriba), pedido una sola vez.
async function ghListMaterial(weekId) {
  const tree = await ghGetTree();
  if (tree === null) return null; // límite de solicitudes de GitHub alcanzado

  const prefix = `materials/${weekId}/`;
  return tree
    .filter(entry =>
      entry.type === 'blob' &&
      entry.path.startsWith(prefix) &&
      !entry.path.slice(prefix.length).includes('/') // solo archivos directos, no subcarpetas
    )
    .map(entry => ({
      name: entry.path.slice(prefix.length),
      path: entry.path,
      sha: entry.sha,
      download_url: ghRawUrl(entry.path)
    }));
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
    ghInvalidateTree();
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('GitHub tardó demasiado en responder. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
    throw err;
  }
}

window.ghMaterials = {
  ghGetToken, ghSetToken, ghClearToken, ghVerifyToken,
  ghUploadMaterial, ghListMaterial, ghDeleteMaterial,
  ghInvalidateTree
};
