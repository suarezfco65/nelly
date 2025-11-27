// global-config.js
const CONFIG = {
  // Rutas para lectura (fetch)
  JSON_URL: "json/datos-basicos.json",
  LOGIN_URL: "login.html",

  // Rutas de archivos en el repositorio
  PATHS: {
    ENCRIPTADO: "json/datos-basicos-encriptado.json", // Solo Datos Básicos
    ACCESOS: "json/accesos-encriptado.json", // NUEVO: Solo Accesos
    TRANSACCIONES: "json/transacciones.json",
    DOCS: "docs/",
  },

  // Atajos
  get DATOS_ENCRYPTED_PATH() {
    return this.PATHS.ENCRIPTADO;
  },
  get ACCESOS_ENCRYPTED_PATH() {
    return this.PATHS.ACCESOS;
  }, // Nuevo getter

  // Configuración de GitHub (Se mantiene igual)
  GITHUB: {
    OWNER: "suarezfco65",
    REPO: "nelly",
    BRANCH: "main",
    API_BASE: "https://api.github.com/repos/suarezfco65/nelly",
  },

  PROXY_URL: "/api/proxy",
};

window.CONFIG = CONFIG;
