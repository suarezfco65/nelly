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
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("claveAcceso");
      seguridad.gestionarTokens.eliminarToken(); // ← NUEVA LÍNEA
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
  if (!verificarAcceso()) return;

  // Inicializar componentes globales
  if (elements.docModal && elements.compraModal) {
    docModalInstance = new bootstrap.Modal(elements.docModal);
    compraModalInstance = new bootstrap.Modal(elements.compraModal);
  }

  inicializarEventosGlobales();

  // INICIALIZACIÓN PARALELA E INDEPENDIENTE
  datosBasicos.inicializar(); // Carga datos-basicos-encriptado.json
  accesos.inicializar(); // Carga accesos-encriptado.json (o busca en el viejo si falla)

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
