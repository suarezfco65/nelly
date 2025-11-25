const github = {
  // Usar la configuración centralizada
  PROXY_URL: CONFIG.PROXY_URL,

  /**
   * Envía una solicitud al endpoint del proxy.
   * @param {string} githubToken - El token de GitHub.
   * @param {string} action - La acción a ejecutar ('listDir', 'updateFile', etc.).
   * @param {string} filePath - La ruta del archivo o directorio.
   * @param {Object} data - Datos adicionales para el cuerpo (payload de GitHub).
   * @returns {Promise<Object>} La respuesta del proxy.
   */
  async _fetchProxy(githubToken, action, filePath, data = {}) {
    if (!githubToken) {
      throw new Error("Token de GitHub no proporcionado para la acción.");
    }

    // El proxy espera un POST con esta estructura
    const bodyPayload = {
      githubToken: githubToken.trim(),
      action: action,
      filePath: filePath,
      data: {
        branch: CONFIG.GITHUB.BRANCH,
        ...data,
      },
    };

    const response = await fetch(this.PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    const result = await response.json();

    if (!result.ok) {
      // Manejo de errores basado en la respuesta estructurada del proxy
      const status = result.status || "500";
      const errorMessage =
        result.data?.message ||
        result.error ||
        "Error desconocido en la llamada al proxy.";
      throw new Error(
        `Error ${status} al ejecutar acción '${action}' en GitHub: ${errorMessage}`
      );
    }

    return result.data; // Devuelve solo los datos (JSON) de la respuesta de GitHub
  },

  /**
   * Verifica la validez y los permisos de un token de GitHub.
   * @param {string} githubToken - El token de GitHub.
   * @returns {Promise<boolean>} True si el token es válido y tiene permisos de lectura.
   */
  async verificarToken(githubToken) {
    const config = CONFIG.GITHUB;
    const tokenLimpio = githubToken.trim();

    if (!tokenLimpio.startsWith("github_pat_")) {
      throw new Error(
        'Formato de token incorrecto (debe empezar con "github_pat_")'
      );
    }

    // Usar el proxy para verificar el token
    try {
      await this._fetchProxy(githubToken, "testRepo", "");
      return true;
    } catch (error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        throw new Error(
          `Token inválido o sin permisos. Revise que tenga permisos de 'Contents: Read and Write' para el repositorio ${config.OWNER}/${config.REPO}.`
        );
      }
      throw error;
    }
  },

  /**
   * Guarda/Actualiza contenido en un archivo de GitHub.
   * @param {string} filePath - La ruta completa del archivo.
   * @param {string} content - El contenido a guardar (ya en Base64).
   * @param {string} githubToken - El token de GitHub.
   * @param {string} commitMessage - Mensaje del commit.
   * @returns {Promise<object>} El objeto de respuesta de la API de GitHub.
   */
  async guardarArchivo(filePath, content, githubToken, commitMessage) {
    const payload = {
      message: commitMessage,
      content: content,
      branch: CONFIG.GITHUB.BRANCH,
    };

    return await this._fetchProxy(githubToken, "updateFile", filePath, payload);
  },

  /**
   * Elimina un archivo de GitHub
   * @param {string} filePath - La ruta completa del archivo
   * @param {string} githubToken - El token de GitHub
   * @param {string} commitMessage - Mensaje del commit
   * @param {string} sha - SHA del archivo (obligatorio para eliminar)
   * @returns {Promise<object>} El objeto de respuesta de la API de GitHub
   */
  async eliminarArchivoDeGitHub(filePath, githubToken, commitMessage, sha) {
    const payload = {
      message: commitMessage,
      sha: sha,
      branch: CONFIG.GITHUB.BRANCH,
    };

    return await this._fetchProxy(githubToken, "deleteFile", filePath, payload);
  },

  /**
   * Obtiene la lista de contenidos (archivos) de un directorio.
   */
  async obtenerContenidoDeDirectorio(githubToken, dirPath = "docs") {
    const contents = await this._fetchProxy(githubToken, "listDir", dirPath);

    // Filtrar solo archivos y mapear para obtener el nombre, ruta completa y SHA
    return contents
      .filter((item) => item.type === "file")
      .map((item) => ({
        nombre: item.name,
        archivo: item.path,
        sha: item.sha,
      }));
  },

  /**
   * Sube un archivo a GitHub
   */
  async subirArchivoAGitHub(
    githubToken,
    filePath,
    fileContentBase64,
    commitMessage
  ) {
    const payload = {
      message: commitMessage,
      content: fileContentBase64,
      branch: CONFIG.GITHUB.BRANCH,
    };

    return await this._fetchProxy(githubToken, "updateFile", filePath, payload);
  },
};

// Se hace el módulo github accesible globalmente
window.github = github;
