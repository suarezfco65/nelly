// app.js

// Configuración global (ELIMINADA, AHORA EN global-config.js)

// Al inicio de app.js, verificar acceso
function verificarAcceso() {
  const claveAcceso = sessionStorage.getItem("claveAcceso");
  if (!claveAcceso) {
    // Usa CONFIG.LOGIN_URL del objeto global
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
  docModal: document.getElementById("docModal"),
  docIframe: document.getElementById("docIframe"),
  docImage: document.getElementById("docImage"),
  docModalTitle: document.getElementById("docModalTitle"),
  compraModal: document.getElementById("compraModal"),
  compraIframe: document.getElementById("compraIframe"),
  compraModalTitle: document.getElementById("compraModalTitle"),
};

// Inicialización de modales Bootstrap
const docModalInstance = new bootstrap.Modal(elements.docModal);
const compraModalInstance = new bootstrap.Modal(elements.compraModal);

// Estado global
const state = {
  imageErrorHandler: null,
};

// Función para inicializar eventos globales
function inicializarEventosGlobales() {}

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

  inicializarEventosGlobales();
  datosBasicos.inicializar();
  documentos.inicializar();
  compras.inicializar();
  transacciones.inicializar();

  // Configurar eventos de limpieza de modales
  elements.docModal.addEventListener("hidden.bs.modal", limpiarModales);
  elements.compraModal.addEventListener("hidden.bs.modal", limpiarModales);

  console.log("Aplicación inicializada correctamente");
}

// Iniciar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarApp);
} else {
  inicializarApp();
}

// Exportar para uso en otros archivos (si es necesario)
window.elements = elements;
window.state = state;
window.docModalInstance = docModalInstance;
window.compraModalInstance = compraModalInstance;
