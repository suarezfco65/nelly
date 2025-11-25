// js/global-config.js
const CONFIG = {
  // Configuración de rutas de lectura (para fetch)
  JSON_URL: "json/datos-basicos.json",
  LOGIN_URL: "login.html",
  
  // Rutas de archivos en el repositorio (para la API de GitHub)
  PATHS: {
    ENCRIPTADO: "json/datos-basicos-encriptado.json",
    TRANSACCIONES: "json/transacciones.json",
    DOCS: "docs/"
  },

  // Configuración base de GitHub
  GITHUB: {
    OWNER: "suarezfco65",
    REPO: "nelly",
    BRANCH: "main",
    API_BASE: "https://api.github.com/repos/suarezfco65/nelly",
  },
  
  PROXY_URL: "/api/proxy" // No se usará en GitHub Pages, pero se deja por compatibilidad
};

window.CONFIG = CONFIG;
