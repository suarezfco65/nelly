const github = {
  // La configuración se obtiene del objeto global CONFIG

  /**
   * Verifica la validez y los permisos de un token de GitHub.
   * @param {string} githubToken - El token de GitHub.
   * @returns {Promise<boolean>} True si el token es válido y tiene permisos de lectura.
   */
  async verificarToken(githubToken) {
    // Asume que CONFIG está cargado globalmente
    const config = CONFIG.GITHUB;
    const tokenLimpio = githubToken.trim();

    if (!tokenLimpio.startsWith("github_pat_")) {
      throw new Error(
        'Formato de token incorrecto (debe empezar con "github_pat_")'
      );
    }

    const response = await fetch(`${config.API_BASE}`, {
      headers: {
        Authorization: `Bearer ${tokenLimpio}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.ok) {
      return true;
    } else {
      const errorData = await response.json();
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Token inválido o sin permisos. Revise que tenga permisos de 'Contents: Write' para el repositorio ${config.OWNER}/${config.REPO}. Detalle: ${errorData.message}`
        );
      } else {
        throw new Error(
          `Error ${response.status}: ${response.statusText}. Detalle: ${errorData.message}`
        );
      }
    }
  },

  /**
   * Guarda/Actualiza contenido en un archivo de GitHub.
   * @param {string} filePath - La ruta completa del archivo (e.g., 'json/datos-basicos-encriptado.json').
   * @param {string} content - El contenido a guardar (debe ser el contenido ya en Base64).
   * @param {string} githubToken - El token de GitHub.
   * @param {string} commitMessage - Mensaje del commit.
   * @returns {Promise<object>} El objeto de respuesta de la API de GitHub (incluye info del commit).
   */
  async guardarArchivo(filePath, content, githubToken, commitMessage) {
    const config = CONFIG.GITHUB;
    const tokenLimpio = githubToken.trim();
    let sha = null;

    // 1. Obtener el SHA del archivo actual (necesario para actualizar)
    try {
      const getResponse = await fetch(
        `${config.API_BASE}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${tokenLimpio}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch (error) {
      console.log(
        `Archivo ${filePath} no existe, se intentará crear nuevo.`,
        error.message
      );
    }

    // 2. Guardar/Actualizar el archivo
    const updateResponse = await fetch(
      `${config.API_BASE}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenLimpio}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          message: commitMessage,
          content: content, // El contenido ya debe estar en Base64
          sha: sha,
          branch: config.BRANCH,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(
        `Error al actualizar GitHub: ${updateResponse.status} - ${errorData.message}`
      );
    }

    return await updateResponse.json();
  },
  /**
   * Elimina un archivo de GitHub
   * @param {string} filePath - La ruta completa del archivo (e.g., 'docs/archivo.pdf')
   * @param {string} githubToken - El token de GitHub
   * @param {string} commitMessage - Mensaje del commit
   * @returns {Promise<object>} El objeto de respuesta de la API de GitHub
   */
  async eliminarArchivo(filePath, githubToken, commitMessage) {
    const config = CONFIG.GITHUB;
    const tokenLimpio = githubToken.trim();
    
    let sha = null;

    // 1. Obtener el SHA del archivo actual
    try {
      const getResponse = await fetch(
        `${config.API_BASE}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${tokenLimpio}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      } else {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }
    } catch (error) {
      console.error("Error obteniendo SHA del archivo:", error);
      throw error;
    }

    // 2. Eliminar el archivo
    const deleteResponse = await fetch(
      `${config.API_BASE}/contents/${filePath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenLimpio}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          message: commitMessage,
          sha: sha,
          branch: config.BRANCH,
        }),
      }
    );

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(
        `Error al eliminar archivo de GitHub: ${deleteResponse.status} - ${errorData.message}`
      );
    }

    return await deleteResponse.json();
  },

  
};

// Se hace el módulo github accesible globalmente
window.github = github;
