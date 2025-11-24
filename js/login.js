// login.js

// NOTA: CONFIG y github ya son objetos globales cargados por otros scripts (global-config.js y github.js)

// Elementos DOM
let loginForm, formCambiarClave, toggleCambiarClave;
let loginFeedback, feedbackCambiarClave, mensajePrimeraVez;

// Inicializar la aplicación de login
function inicializarLogin() {
  // Referencias a elementos DOM
  loginForm = document.getElementById("loginForm");
  formCambiarClave = document.getElementById("formCambiarClave");
  toggleCambiarClave = document.getElementById("toggleCambiarClave");
  loginFeedback = document.getElementById("loginFeedback");
  feedbackCambiarClave = document.getElementById("feedbackCambiarClave");
  mensajePrimeraVez = document.getElementById("mensajePrimeraVez");

  // Configurar eventos
  configurarEventos();

  // Verificar si es primera vez
  verificarPrimeraVez();

  console.log("✅ Sistema de login inicializado");
}

// Configurar todos los eventos
function configurarEventos() {
  // Inicializar toggles de contraseña
  inicializarTogglesPassword();

  // Toggle sección cambiar clave
  toggleCambiarClave.addEventListener("click", toggleSeccionCambiarClave);

  // Manejar login normal
  loginForm.addEventListener("submit", manejarLogin);

  // Manejar cambio de clave
  formCambiarClave.addEventListener("submit", manejarCambioClave);
}

// Inicializar toggles de contraseña
function inicializarTogglesPassword() {
  document.querySelectorAll(".password-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const input = this.closest(".input-group").querySelector("input");
      const type =
        input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      this.innerHTML =
        type === "password"
          ? '<i class="bi bi-eye"></i>'
          : '<i class="bi bi-eye-slash"></i>';
    });
  });
}

// Alternar sección de cambio de clave
function toggleSeccionCambiarClave(e) {
  e.preventDefault();
  const target = document.getElementById("seccionCambiarClave");
  const isExpanded = target.classList.toggle("show");
  e.target.textContent = isExpanded
    ? "Ocultar Cambio/Migración de Clave"
    : "Cambiar Clave y Migrar Datos";

  // Limpiar feedback cuando se oculta
  if (!isExpanded) {
    feedbackCambiarClave.innerHTML = "";
    formCambiarClave.reset();
  }
}

// Verificar si es primera vez (archivo encriptado no existe)
async function verificarPrimeraVez() {
  try {
    // Usa la ruta centralizada
    const response = await fetch(CONFIG.DATOS_ENCRIPTADOS_PATH);
    if (!response.ok) {
      // Archivo no existe o hay un error (ej. 404)
      mensajePrimeraVez.classList.remove("d-none");
    } else {
      mensajePrimeraVez.classList.add("d-none");
    }
  } catch (error) {
    // Error de red, etc.
    console.error("Error al verificar archivo encriptado:", error);
    mensajePrimeraVez.classList.add("d-none"); // Ocultar si hay error de red
  }
}

// Manejador del submit del formulario de login
function manejarLogin(e) {
  e.preventDefault();
  const clave = document.getElementById("claveAcceso").value;
  if (clave) {
    procesarLogin(clave.trim());
  }
}

// Manejador del submit del formulario de cambio de clave
function manejarCambioClave(e) {
  e.preventDefault();
  const claveActual = document.getElementById("claveActual").value;
  const claveNueva = document.getElementById("claveNueva").value;
  const claveNuevaConfirmar = document.getElementById(
    "claveNuevaConfirmar"
  ).value;
  const tokenGitHub = document.getElementById("tokenGitHub").value;

  if (claveNueva !== claveNuevaConfirmar) {
    mostrarFeedback(
      feedbackCambiarClave,
      "La nueva clave y su confirmación no coinciden.",
      "danger"
    );
    return;
  }

  if (claveActual === claveNueva) {
    mostrarFeedback(
      feedbackCambiarClave,
      "La clave nueva debe ser diferente de la clave actual.",
      "danger"
    );
    return;
  }

  cambiarClaveYMigrar(
    claveActual.trim(),
    claveNueva.trim(),
    tokenGitHub.trim()
  );
}

// Función para procesar login
async function procesarLogin(clave) {
  try {
    mostrarFeedback(loginFeedback, "Verificando clave...", "info", true);

    let archivoEncriptadoExiste = false;
    try {
      // Usa la ruta centralizada
      const testResponse = await fetch(CONFIG.DATOS_ENCRIPTADOS_PATH);
      archivoEncriptadoExiste = testResponse.ok;
    } catch (error) {
      archivoEncriptadoExiste = false;
    }

    if (!archivoEncriptadoExiste) {
      // PRIMERA VEZ (No hay archivo encriptado, se acepta cualquier clave)

      // La clave ingresada por el usuario será la clave inicial.

      mostrarFeedback(
        loginFeedback,
        "Sistema inicializado con la clave proporcionada. Redirigiendo...",
        "success"
      );
      sessionStorage.setItem("claveAcceso", clave); // Establece la clave ingresada como la nueva clave de acceso

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500Nue
    } else {
      // NO ES PRIMERA VEZ
      // Usa la ruta centralizada
      const response = await fetch(CONFIG.DATOS_ENCRIPTADOS_PATH);
      if (!response.ok) {
        throw new Error("Error al cargar los datos encriptados");
      }

      const datosEncriptados = await response.text();
      // Si la desencriptación falla, lanzará una excepción
      await seguridad.desencriptar(datosEncriptados, clave);

      mostrarFeedback(
        loginFeedback,
        "Clave verificada. Redirigiendo...",
        "success"
      );
      sessionStorage.setItem("claveAcceso", clave);

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    }
  } catch (error) {
    console.error("Error en login:", error);
    if (
      error.message.includes("Clave incorrecta") ||
      error.message.includes("desencriptar")
    ) {
      mostrarFeedback(
        loginFeedback,
        "Clave de acceso incorrecta. Intente de nuevo.",
        "danger"
      );
    } else {
      mostrarFeedback(
        loginFeedback,
        "Error inesperado al intentar iniciar sesión.",
        "danger"
      );
    }
  }
}

// Lógica de cambio de clave y migración
async function cambiarClaveYMigrar(claveActual, claveNueva, tokenGitHub) {
  const btn = document.querySelector("#formCambiarClave button[type='submit']");
  btn.disabled = true;

  try {
    mostrarFeedback(
      feedbackCambiarClave,
      "Iniciando proceso: Verificando token y clave actual...",
      "info",
      true
    );

    // 1. Verificar Token (USANDO github.js)
    // github.js se encarga de verificar el formato y los permisos.
    await github.verificarToken(tokenGitHub);

    // 2. Cargar y Desencriptar con la clave actual
    // Usa la ruta centralizada
    const response = await fetch(CONFIG.DATOS_ENCRIPTADOS_PATH);
    if (!response.ok) {
      // Si el archivo encriptado no existe, cargamos el archivo inicial para migrar
      // Usa la ruta centralizada
      const initialResponse = await fetch(CONFIG.JSON_URL);
      if (!initialResponse.ok) {
        throw new Error(
          "No se pudo cargar el archivo inicial de datos básicos."
        );
      }
      // No hay clave actual que verificar, solo cargamos los datos.
      var datos = await initialResponse.json();

      if (!claveActual) {
        // Esto solo ocurre si un usuario intenta migrar un archivo inicial sin proporcionar clave.
        throw new Error(
          "Clave actual no proporcionada. Se asume que el archivo inicial (datos-basicos.json) no está encriptado y se procederá a encriptarlo con la clave nueva. La clave actual es requerida solo si existe un archivo encriptado."
        );
      }
    } else {
      // Archivo encriptado existe, verificamos la clave actual
      const datosEncriptados = await response.text();
      var datos = await seguridad.desencriptar(datosEncriptados, claveActual);
    }

// 3. Encriptar con la nueva clave
const datosEncriptadosNuevosStr = await seguridad.encriptar(datos, claveNueva);

// CORRECCIÓN AÑADIDA: Base64 para la API de GitHub
const datosEncriptadosBase64ForAPI = btoa(datosEncriptadosNuevosStr); // <-- ¡Añadir!

// 4. Guardar en GitHub (USANDO github.js)
// Usa la ruta centralizada
const commitMessage = `Cambio de clave y migración de datos básicos por ${datos.nombre}`;
await github.guardarArchivo(
  CONFIG.DATOS_ENCRIPTADOS_PATH,
  datosEncriptadosBase64ForAPI, // <-- Usar la nueva variable
  tokenGitHub,
  commitMessage
);
    
    // 5. Finalizar
    sessionStorage.setItem("claveAcceso", claveNueva);
    btn.disabled = false;
    mostrarFeedback(
      feedbackCambiarClave,
      "🎉 ¡Operación completada! Nueva clave aplicada y guardada en GitHub. Redirigiendo...",
      "success"
    );

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (error) {
    console.error("Error cambiando clave:", error);
    btn.disabled = false;
    if (
      error.message.includes("Clave incorrecta") ||
      error.message.includes("desencriptar")
    ) {
      mostrarFeedback(
        feedbackCambiarClave,
        "La clave actual proporcionada es incorrecta o no coincide con los datos.",
        "danger"
      );
    } else if (
      error.message.includes("Token inválido") ||
      error.message.includes("permisos")
    ) {
      // Los errores detallados vienen de github.js
      mostrarFeedback(feedbackCambiarClave, error.message, "danger");
    } else if (error.message.includes("GitHub")) {
      mostrarFeedback(
        feedbackCambiarClave,
        `Error de GitHub: ${error.message}`,
        "danger"
      );
    } else {
      mostrarFeedback(
        feedbackCambiarClave,
        "Error al cambiar la clave: " + error.message,
        "danger"
      );
    }
  }
}

// Función utilitaria para mostrar feedback
function mostrarFeedback(elemento, mensaje, tipo, conSpinner = false) {
  const icono =
    tipo === "success"
      ? "bi-check-circle"
      : tipo === "danger"
      ? "bi-exclamation-triangle"
      : "bi-info-circle";

  elemento.innerHTML = `
        <div class="alert alert-${tipo}">
            ${
              conSpinner
                ? '<div class="spinner-border spinner-border-sm me-2"></div>'
                : `<i class="bi ${icono}"></i>`
            }
            ${mensaje}
        </div>
    `;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarLogin);
} else {
  inicializarLogin();
}
