const CONFIG = {
  // Rutas para lectura (fetch)
  JSON_URL: "json/datos-basicos.json",
  LOGIN_URL: "login.html",
  
  // Rutas de archivos en el repositorio (CRÍTICO: No modificar estas rutas)
  PATHS: {
    ENCRIPTADO: "json/datos-basicos-encriptado.json", // Aquí van claves y accesos
    TRANSACCIONES: "json/transacciones.json",        // Aquí van los gastos
    DOCS: "docs/"                                    // Carpeta de documentos
  },

  // Atajos para compatibilidad con scripts antiguos (Redireccionan a PATHS)
  get DATOS_ENCRYPTED_PATH() { return this.PATHS.ENCRIPTADO; },

  // Configuración de GitHub
  GITHUB: {
    OWNER: "suarezfco65", // Tu usuario
    REPO: "nelly",       // Tu repositorio
    BRANCH: "main",
    API_BASE: "https://api.github.com/repos/suarezfco65/nelly",
  },
  
  PROXY_URL: "/api/proxy" // Solo por compatibilidad, no se usa en Pages
};

window.CONFIG = CONFIG;
