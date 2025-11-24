const CONFIG = {
  // Configuración de rutas de la aplicación
  JSON_URL: "json/datos-basicos.json",
  LOGIN_URL: "login.html",
  DATOS_ENCRIPTADOS_PATH: "json/datos-basicos-encriptado.json",
  TRANSACCIONES_PATH: "json/transacciones.json", // Ruta para el módulo transacciones.js

  // Configuración centralizada de GitHub
  GITHUB: {
    OWNER: "suarezfco65",
    REPO: "nelly",
    BRANCH: "main",
    API_BASE: "https://api.github.com/repos/suarezfco65/nelly",
  },
};

// Se hace la configuración globalmente accesible (window.CONFIG)
window.CONFIG = CONFIG;
