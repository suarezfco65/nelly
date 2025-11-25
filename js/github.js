// github.js - VERSIÓN COMPATIBLE CON GITHUB PAGES
const github = {
  PROXY_URL: CONFIG.PROXY_URL,

  // Función centralizada para obtener token
  obtenerToken: function(solicitarSiFalta = true, proposito = "esta operación") {
    let token = seguridad.gestionarTokens.obtenerToken();
    
    if (!token && solicitarSiFalta) {
      token = prompt(`Para ${proposito}, ingrese su Token de GitHub:`);
      if (token) {
        seguridad.gestionarTokens.guardarToken(token);
      }
    }
    
    return token;
  },

  // Función para detectar si estamos en GitHub Pages
  _esGitHubPages: function() {
    return window.location.hostname.includes('github.io');
  },

  // Función principal que decide si usar proxy o GitHub directamente
  async _fetchProxy(action, filePath, data = {}, solicitarToken = true) {
    const token = this.obtenerToken(solicitarToken, `ejecutar ${action}`);
    if (!token) {
      throw new Error("Token de GitHub no proporcionado");
    }

    // En GitHub Pages, usar GitHub API directamente
    if (this._esGitHubPages()) {
      return await this._fetchGitHubDirectly(token, action, filePath, data);
    }

    // Para otros entornos, intentar usar el proxy
    try {
      const bodyPayload = {
        githubToken: token.trim(),
        action: action,
        filePath: filePath,
        data: {
          branch: CONFIG.GITHUB.BRANCH,
          ...data
        }
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
        const status = result.status || '500';
        const errorMessage = result.data?.message || result.error || 'Error desconocido en la llamada al proxy.';
        throw new Error(`Error ${status} al ejecutar acción '${action}' en GitHub: ${errorMessage}`);
      }

      return result.data;
    } catch (proxyError) {
      console.warn('Proxy falló, usando GitHub directamente:', proxyError);
      return await this._fetchGitHubDirectly(token, action, filePath, data);
    }
  },

  // Función para llamar a GitHub API directamente (sin proxy)
  async _fetchGitHubDirectly(githubToken, action, filePath, data = {}) {
    const GITHUB_API_BASE = "https://api.github.com/repos/suarezfco65/nelly";
    let url;
    let options = {
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Nelly-App"
      }
    };

    switch (action) {
      case "getFile":
        if (!filePath) {
          throw new Error("filePath requerido para getFile");
        }
        url = `${GITHUB_API_BASE}/contents/${filePath}`;
        options.method = "GET";
        break;

      case "listDir":
        if (!filePath) {
          throw new Error("filePath requerido para listDir");
        }
        const branch = data.branch || "main";
        url = `${GITHUB_API_BASE}/contents/${filePath}?ref=${branch}`;
        options.method = "GET";
        break;

      case "updateFile":
        if (!filePath) {
          throw new Error("filePath requerido para updateFile");
        }
        url = `${GITHUB_API_BASE}/contents/${filePath}`;
        options.method = "PUT";
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
        break;

      case "deleteFile":
        if (!filePath) {
          throw new Error("filePath requerido para deleteFile");
        }
        url = `${GITHUB_API_BASE}/contents/${filePath}`;
        options.method = "DELETE";
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
        break;

      case "testRepo":
        url = GITHUB_API_BASE;
        options.method = "GET";
        break;

      default:
        throw new Error("Acción no válida: " + action);
    }

    console.log(`🔗 GitHub API Directa: ${action} -> ${url}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = `GitHub API Error: ${response.status} - ${errorData.message}`;
      console.error(errorMessage, errorData);
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Función para verificar token
  async verificarToken(token = null) {
    const config = CONFIG.GITHUB;
    const tokenUsar = token || this.obtenerToken(true, "verificar permisos");

    if (!tokenUsar) {
      throw new Error("Token no proporcionado");
    }

    const tokenLimpio = tokenUsar.trim();
    
    if (!tokenLimpio.startsWith("github_pat_")) {
      throw new Error('Formato de token incorrecto (debe empezar con "github_pat_")');
    }

    try {
      await this._fetchProxy('testRepo', '', {}, false);
      return true;
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error(
          `Token inválido o sin permisos. Revise que tenga permisos de 'Contents: Read and Write' para el repositorio ${config.OWNER}/${config.REPO}. Detalle: ${error.message}`
        );
      }
      throw error;
    }
  },

  // Función para obtener contenido de directorio
  async obtenerContenidoDeDirectorio(dirPath = 'docs') {
    const contents = await this._fetchProxy('listDir', dirPath, {}, true);
    
    // Filtrar solo archivos y mapear para obtener el nombre, ruta completa y SHA
    return contents
      .filter(item => item.type === 'file')
      .map(item => ({
          nombre: item.name, 
          archivo: item.path, 
          sha: item.sha 
      }));
  },

  // Función para guardar archivo
  async guardarArchivo(filePath, content, commitMessage) {
    const payload = {
      message: commitMessage,
      content: content,
      branch: CONFIG.GITHUB.BRANCH,
    };
    
    return await this._fetchProxy('updateFile', filePath, payload, true);
  },

  // Función para eliminar archivo
  async eliminarArchivoDeGitHub(filePath, commitMessage, sha) {
    const payload = {
      message: commitMessage,
      sha: sha,
      branch: CONFIG.GITHUB.BRANCH,
    };
    
    return await this._fetchProxy('deleteFile', filePath, payload, true);
  },

  // Función para subir archivo
  async subirArchivoAGitHub(filePath, fileContentBase64, commitMessage) {
    const payload = {
      message: commitMessage,
      content: fileContentBase64,
      branch: CONFIG.GITHUB.BRANCH,
    };
    
    return await this._fetchProxy('updateFile', filePath, payload, true);
  },
};

// Se hace el módulo github accesible globalmente
window.github = github;
