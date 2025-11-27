// login.js - VERSIÓN CORREGIDA FINAL

// Elementos DOM
let loginForm, formCambiarClave, toggleCambiarClave;
let loginFeedback, feedbackCambiarClave, mensajePrimeraVez;

function inicializarLogin() {
  loginForm = document.getElementById("loginForm");
  formCambiarClave = document.getElementById("formCambiarClave");
  toggleCambiarClave = document.getElementById("toggleCambiarClave");
  loginFeedback = document.getElementById("loginFeedback");
  feedbackCambiarClave = document.getElementById("feedbackCambiarClave");
  mensajePrimeraVez = document.getElementById("mensajePrimeraVez");

  configurarEventos();
  verificarPrimeraVez();
  console.log("✅ Sistema de login inicializado");
}

function configurarEventos() {
  inicializarTogglesPassword();
  toggleCambiarClave.addEventListener("click", toggleSeccionCambiarClave);
  loginForm.addEventListener("submit", manejarLogin);
  formCambiarClave.addEventListener("submit", manejarCambioClave);
}

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

function toggleSeccionCambiarClave(e) {
  e.preventDefault();
  const target = document.getElementById("seccionCambiarClave");
  const isExpanded = target.classList.toggle("show");
  e.target.textContent = isExpanded
    ? "Ocultar Cambio/Migración"
    : "Cambiar Clave y Migrar Datos";
  if (!isExpanded) {
    feedbackCambiarClave.innerHTML = "";
    formCambiarClave.reset();
  }
}

async function verificarPrimeraVez() {
  try {
    const response = await fetch(CONFIG.PATHS.ENCRIPTADO);
    if (!response.ok) mensajePrimeraVez.classList.remove("d-none");
    else mensajePrimeraVez.classList.add("d-none");
  } catch (error) {
    console.error("Error verificando archivo:", error);
  }
}

function manejarLogin(e) {
  e.preventDefault();
  const clave = document.getElementById("claveAcceso").value;
  if (clave) procesarLogin(clave.trim());
}

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
      "La clave nueva debe ser diferente a la actual.",
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

async function procesarLogin(clave) {
  try {
    mostrarFeedback(loginFeedback, "Verificando clave...", "info", true);
    let archivoExiste = false;
    try {
      const test = await fetch(CONFIG.PATHS.ENCRIPTADO);
      archivoExiste = test.ok;
    } catch (e) {
      archivoExiste = false;
    }

    if (!archivoExiste) {
      mostrarFeedback(
        loginFeedback,
        "Sistema nuevo. Configurando clave...",
        "success"
      );
      sessionStorage.setItem("claveAcceso", clave);
      setTimeout(() => (window.location.href = "index.html"), 1500);
    } else {
      const response = await fetch(CONFIG.PATHS.ENCRIPTADO);
      if (!response.ok) throw new Error("Error cargando datos");
      const datosEnc = await response.text();
      await seguridad.desencriptar(datosEnc, clave); // Valida la clave

      mostrarFeedback(loginFeedback, "Acceso concedido.", "success");
      sessionStorage.setItem("claveAcceso", clave);
      setTimeout(() => (window.location.href = "index.html"), 1000);
    }
  } catch (error) {
    console.error(error);
    mostrarFeedback(loginFeedback, "Clave incorrecta.", "danger");
  }
}

// login.js - Función cambiarClaveYMigrar actualizada
async function cambiarClaveYMigrar(claveActual, claveNueva, tokenGitHub) {
  const btn = document.querySelector("#formCambiarClave button[type='submit']");
  btn.disabled = true;

  try {
    mostrarFeedback(feedbackCambiarClave, "Verificando...", "info", true);
    seguridad.gestionarTokens.guardarToken(tokenGitHub);
    await github.verificarToken();

    // 1. Procesar DATOS BÁSICOS
    let datosB;
    let shaB = null;
    try {
      const respB = await fetch(CONFIG.PATHS.ENCRIPTADO);
      if (respB.ok) {
        const txtB = await respB.text();
        // Desencriptar con clave vieja
        const jsonB = await seguridad.desencriptar(txtB, claveActual);
        // Limpiar si traía accesos pegados (migración forzosa)
        datosB = { "datos-basicos": jsonB["datos-basicos"] || [] };

        // Obtener SHA para actualizar
        const fileB = await github._fetchProxy(
          "getFile",
          CONFIG.PATHS.ENCRIPTADO,
          {},
          false
        );
        shaB = fileB.sha;
      } else {
        // Si no existe, cargar plantilla default
        const initResp = await fetch(CONFIG.JSON_URL);
        datosB = await initResp.json();
      }
    } catch (e) {
      throw new Error("Error leyendo datos básicos actuales");
    }

    // 2. Procesar ACCESOS (Intentar leer del archivo nuevo, si no, del viejo)
    let datosA = { accesos: [] };
    let shaA = null;
    try {
      // Intentar leer el archivo nuevo
      const respA = await fetch(CONFIG.PATHS.ACCESOS);
      if (respA.ok) {
        const txtA = await respA.text();
        datosA = await seguridad.desencriptar(txtA, claveActual);
        const fileA = await github._fetchProxy(
          "getFile",
          CONFIG.PATHS.ACCESOS,
          {},
          false
        );
        shaA = fileA.sha;
      } else {
        // Si no existe el archivo nuevo, intentar rescatar del viejo
        const respOld = await fetch(CONFIG.PATHS.ENCRIPTADO);
        if (respOld.ok) {
          const txtOld = await respOld.text();
          const jsonOld = await seguridad.desencriptar(txtOld, claveActual);
          if (jsonOld.accesos) datosA = { accesos: jsonOld.accesos };
        }
      }
    } catch (e) {
      console.warn(
        "No se pudieron recuperar accesos anteriores, se iniciará vacío"
      );
    }

    // 3. Re-encriptar AMBOS con la NUEVA CLAVE
    const encB = await seguridad.encriptar(datosB, claveNueva);
    const encA = await seguridad.encriptar(datosA, claveNueva);

    mostrarFeedback(
      feedbackCambiarClave,
      "Actualizando archivos...",
      "info",
      true
    );

    // 4. Subir AMBOS archivos
    // Guardar Datos Básicos
    await github.guardarArchivo(
      CONFIG.PATHS.ENCRIPTADO,
      btoa(encB),
      "Cambio clave (Basicos)",
      shaB
    );

    // Guardar Accesos (Creará el archivo si no existía, shaA será null)
    await github.guardarArchivo(
      CONFIG.PATHS.ACCESOS,
      btoa(encA),
      "Cambio clave (Accesos)",
      shaA
    );

    sessionStorage.setItem("claveAcceso", claveNueva);
    btn.disabled = false;
    mostrarFeedback(
      feedbackCambiarClave,
      "¡Clave cambiada y archivos separados exitosamente!",
      "success"
    );
    setTimeout(() => (window.location.href = "index.html"), 2000);
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    mostrarFeedback(feedbackCambiarClave, "Error: " + error.message, "danger");
  }
}

function mostrarFeedback(el, msg, type, spinner = false) {
  const icon =
    type === "success"
      ? "bi-check-circle"
      : type === "danger"
      ? "bi-exclamation-triangle"
      : "bi-info-circle";
  el.innerHTML = `<div class="alert alert-${type}">${
    spinner
      ? '<div class="spinner-border spinner-border-sm me-2"></div>'
      : `<i class="bi ${icon}"></i>`
  } ${msg}</div>`;
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", inicializarLogin);
else inicializarLogin();
