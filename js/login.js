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
      const type = input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      this.innerHTML = type === "password" ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });
  });
}

function toggleSeccionCambiarClave(e) {
  e.preventDefault();
  const target = document.getElementById("seccionCambiarClave");
  const isExpanded = target.classList.toggle("show");
  e.target.textContent = isExpanded ? "Ocultar Cambio/Migración" : "Cambiar Clave y Migrar Datos";
  if (!isExpanded) {
     feedbackCambiarClave.innerHTML = '';
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
  const claveNuevaConfirmar = document.getElementById("claveNuevaConfirmar").value;
  const tokenGitHub = document.getElementById("tokenGitHub").value;

  if (claveNueva !== claveNuevaConfirmar) {
    mostrarFeedback(feedbackCambiarClave, "La nueva clave y su confirmación no coinciden.", "danger");
    return;
  }
  if (claveActual === claveNueva) {
     mostrarFeedback(feedbackCambiarClave, "La clave nueva debe ser diferente a la actual.", "danger");
    return;
  }
  cambiarClaveYMigrar(claveActual.trim(), claveNueva.trim(), tokenGitHub.trim());
}

async function procesarLogin(clave) {
  try {
    mostrarFeedback(loginFeedback, "Verificando clave...", "info", true);
    let archivoExiste = false;
    try {
      const test = await fetch(CONFIG.PATHS.ENCRIPTADO);
      archivoExiste = test.ok;
    } catch (e) { archivoExiste = false; }

    if (!archivoExiste) {
      mostrarFeedback(loginFeedback, "Sistema nuevo. Configurando clave...", "success");
      sessionStorage.setItem("claveAcceso", clave);
      setTimeout(() => window.location.href = "index.html", 1500);
    } else {
      const response = await fetch(CONFIG.PATHS.ENCRIPTADO);
      if (!response.ok) throw new Error("Error cargando datos");
      const datosEnc = await response.text();
      await seguridad.desencriptar(datosEnc, clave); // Valida la clave
      
      mostrarFeedback(loginFeedback, "Acceso concedido.", "success");
      sessionStorage.setItem("claveAcceso", clave);
      setTimeout(() => window.location.href = "index.html", 1000);
    }
  } catch (error) {
    console.error(error);
    mostrarFeedback(loginFeedback, "Clave incorrecta.", "danger");
  }
}

async function cambiarClaveYMigrar(claveActual, claveNueva, tokenGitHub) {
  const btn = document.querySelector("#formCambiarClave button[type='submit']");
  btn.disabled = true;

  try {
    mostrarFeedback(feedbackCambiarClave, "Verificando token y clave actual...", "info", true);

    // 1. Guardar token temporalmente para que github.js lo pueda usar
    seguridad.gestionarTokens.guardarToken(tokenGitHub);

    // 2. Verificar Token
    await github.verificarToken();

    // 3. Obtener datos actuales (Desencriptar)
    let datos;
    const response = await fetch(CONFIG.PATHS.ENCRIPTADO);
    if (!response.ok) {
      const initResp = await fetch(CONFIG.JSON_URL);
      datos = await initResp.json();
    } else {
      const textoEnc = await response.text();
      datos = await seguridad.desencriptar(textoEnc, claveActual);
    }

    // 4. Re-encriptar con NUEVA clave
    const datosEncStr = await seguridad.encriptar(datos, claveNueva);
    const datosBase64 = btoa(datosEncStr); // Base64 para GitHub API

    mostrarFeedback(feedbackCambiarClave, "Guardando nueva configuración...", "info", true);

    // 5. Guardar en GitHub (USANDO LA FIRMA CORRECTA: path, content, message, sha)
    // Nota: Pasamos null en SHA para que github.js lo busque automáticamente
    await github.guardarArchivo(
      CONFIG.PATHS.ENCRIPTADO,
      datosBase64,
      `Cambio de clave por ${datos["datos-basicos"]?.[0]?.valor || "Usuario"}`,
      null 
    );

    sessionStorage.setItem("claveAcceso", claveNueva);
    btn.disabled = false;
    mostrarFeedback(feedbackCambiarClave, "¡Éxito! Redirigiendo...", "success");
    setTimeout(() => window.location.href = "index.html", 2000);

  } catch (error) {
    console.error(error);
    btn.disabled = false;
    mostrarFeedback(feedbackCambiarClave, "Error: " + error.message, "danger");
  }
}

function mostrarFeedback(el, msg, type, spinner = false) {
  const icon = type === "success" ? "bi-check-circle" : type === "danger" ? "bi-exclamation-triangle" : "bi-info-circle";
  el.innerHTML = `<div class="alert alert-${type}">${spinner ? '<div class="spinner-border spinner-border-sm me-2"></div>' : `<i class="bi ${icon}"></i>`} ${msg}</div>`;
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializarLogin);
else inicializarLogin();
