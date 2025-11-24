// app.js (CORREGIDO)

// Configuración global
const CONFIG = {
  // Se mantienen las URLs para compatibilidad en la carga/migración
  JSON_URL: "json/datos-basicos.json",
  DATOS_ENCRYPTED_PATH: "json/datos-basicos-encriptado.json",
  LOGIN_URL: "login.html",
  // Simulación de configuración de GitHub
  GITHUB: {
    OWNER: "suarezfco65",
    REPO: "nelly",
    FILE_PATH: "json/datos-basicos-encriptado.json",
    API_BASE: "https://api.github.com/repos/suarezfco65/nelly",
  },
};

// Se definen con 'let' para poder asignarles la instancia de Modal más tarde
let docModalInstance;
let compraModalInstance;

// Al inicio de app.js, verificar acceso
function verificarAcceso() {
  const claveAcceso = sessionStorage.getItem("claveAcceso");
  if (!claveAcceso) {
    window.location.href = CONFIG.LOGIN_URL;
    return false;
  }
  return true;
}

// Elementos DOM globales
const elements = {
  unmaskBtn: document.getElementById("unmaskBtn"),
  masterKey: document.getElementById("masterKey"),
  feedback: document.getElementById("feedback"),
  datosContent: document.getElementById("datosContent"),
  // AÑADIDO: Contenedor para la nueva pestaña
  accesosContent: document.getElementById("accesosContent"),
  docModal: document.getElementById("docModal"),
  docIframe: document.getElementById("docIframe"),
  docImage: document.getElementById("docImage"),
  docModalTitle: document.getElementById("docModalTitle"),
  compraModal: document.getElementById("compraModal"),
  compraIframe: document.getElementById("compraIframe"),
  compraModalTitle: document.getElementById("compraModalTitle"),
  // Botón de logout
  logoutBtn: document.getElementById("logoutBtn"),
};

// Estado global
const state = {
  imageErrorHandler: null,
};

// Función para inicializar eventos globales
function inicializarEventosGlobales() {
  // Evento para el botón de salir (logout)
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("claveAcceso");
      window.location.href = CONFIG.LOGIN_URL;
    });
  }
}

// Función para limpiar modales (global)
function limpiarModales() {
  elements.docIframe.src = "";
  elements.compraIframe.src = "";

  if (state.imageErrorHandler) {
    elements.docImage.removeEventListener("error", state.imageErrorHandler);
    state.imageErrorHandler = null;
  }

  setTimeout(() => {
    elements.docImage.src = "";
  }, 100);
}

// Inicializar la aplicación
function inicializarApp() {
  // verificación de acceso al iniciar
  if (!verificarAcceso()) return;

  // CORRECCIÓN DEL ERROR: Inicializar modales DENTRO de inicializarApp
  // para asegurar que los elementos DOM estén disponibles.
  if (elements.docModal && elements.compraModal) {
    // Las variables globales 'let' se asignan aquí.
    docModalInstance = new bootstrap.Modal(elements.docModal);
    compraModalInstance = new bootstrap.Modal(elements.compraModal);
  } else {
    console.error(
      "No se pudieron inicializar los modales de Bootstrap: Elementos no encontrados."
    );
  }

  inicializarEventosGlobales();
  // El módulo datosBasicos se encarga de cargar y delegar a accesos.js
  datosBasicos.inicializar();
  documentos.inicializar();
  compras.inicializar();
  transacciones.inicializar();

  // Configurar eventos de limpieza de modales
  if (elements.docModal)
    elements.docModal.addEventListener("hidden.bs.modal", limpiarModales);
  if (elements.compraModal)
    elements.compraModal.addEventListener("hidden.bs.modal", limpiarModales);

  console.log("Aplicación inicializada correctamente");
}

// Iniciar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarApp);
} else {
  inicializarApp();
}

// Exportar para uso en otros archivos
window.CONFIG = CONFIG;
window.elements = elements;
window.state = state;
window.docModalInstance = docModalInstance;
window.compraModalInstance = compraModalInstance;
