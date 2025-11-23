// Configuración
const CONFIG_LOGIN = {
  CLAVE_POR_DEFECTO: "Ncq123",
  GITHUB: {
    OWNER: "suarezfco65",
    REPO: "nelly",
    BRANCH: "main",
  },
};

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

// Toggle sección cambiar clave
function toggleSeccionCambiarClave() {
  const isVisible = formCambiarClave.style.display === "block";
  formCambiarClave.style.display = isVisible ? "none" : "block";
  this.innerHTML = isVisible
    ? '<i class="bi bi-arrow-down-short"></i>'
    : '<i class="bi bi-arrow-up-short"></i>';

  if (!isVisible) {
    formCambiarClave.reset();
    feedbackCambiarClave.innerHTML = "";
  }
}

// Verificar si es la primera vez
async function verificarPrimeraVez() {
  try {
    const response = await fetch("json/datos-basicos-encriptado.json");
    const archivoEncriptadoExiste = response.ok;

    if (!archivoEncriptadoExiste) {
      mensajePrimeraVez.style.display = "block";
      document.querySelector(".cambiar-clave-section").style.display = "none";
    } else {
      mensajePrimeraVez.style.display = "none";
    }
  } catch (error) {
    mensajePrimeraVez.style.display = "block";
    document.querySelector(".cambiar-clave-section").style.display = "none";
  }
}

// Manejar login normal
async function manejarLogin(e) {
  e.preventDefault();

  const clave = document.getElementById("claveAcceso").value.trim();

  if (!clave) {
    mostrarFeedback(loginFeedback, "Ingrese la clave de acceso", "danger");
    return;
  }

  await procesarLogin(clave);
}

// Manejar cambio de clave
async function manejarCambioClave(e) {
  e.preventDefault();

  const claveActual = document.getElementById("claveActual").value.trim();
  const nuevaClave = document.getElementById("nuevaClave").value.trim();
  const confirmarClave = document.getElementById("confirmarClave").value.trim();
  const tokenGitHub = document.getElementById("tokenGitHub").value.trim();

  // Validaciones
  if (!claveActual || !nuevaClave || !confirmarClave || !tokenGitHub) {
    mostrarFeedback(
      feedbackCambiarClave,
      "Todos los campos son requeridos",
      "danger"
    );
    return;
  }

  if (nuevaClave.length < 4) {
    mostrarFeedback(
      feedbackCambiarClave,
      "La nueva clave debe tener al menos 4 caracteres",
      "danger"
    );
    return;
  }

  if (nuevaClave !== confirmarClave) {
    mostrarFeedback(
      feedbackCambiarClave,
      "Las nuevas claves no coinciden",
      "danger"
    );
    return;
  }

  if (nuevaClave === claveActual) {
    mostrarFeedback(
      feedbackCambiarClave,
      "La nueva clave debe ser diferente a la actual",
      "danger"
    );
    return;
  }

  if (!tokenGitHub.startsWith("github_pat_")) {
    mostrarFeedback(
      feedbackCambiarClave,
      'Formato de token incorrecto. Debe empezar con "github_pat_"',
      "danger"
    );
    return;
  }

  await procesarCambioClave(claveActual, nuevaClave, tokenGitHub);
}

// Función para procesar login
async function procesarLogin(clave) {
  try {
    mostrarFeedback(loginFeedback, "Verificando clave...", "info", true);

    let archivoEncriptadoExiste = false;
    try {
      const testResponse = await fetch("json/datos-basicos-encriptado.json");
      archivoEncriptadoExiste = testResponse.ok;
    } catch (error) {
      archivoEncriptadoExiste = false;
    }

    if (!archivoEncriptadoExiste) {
      // PRIMERA VEZ
      if (clave !== CONFIG_LOGIN.CLAVE_POR_DEFECTO) {
        throw new Error(
          `Clave incorrecta. Para la primera configuración debe usar: ${CONFIG_LOGIN.CLAVE_POR_DEFECTO}`
        );
      }

      mostrarFeedback(
        loginFeedback,
        "Sistema inicializado. Redirigiendo...",
        "success"
      );
      sessionStorage.setItem("claveAcceso", clave);

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } else {
      // NO ES PRIMERA VEZ
      const response = await fetch("json/datos-basicos-encriptado.json");
      if (!response.ok) {
        throw new Error("Error al cargar los datos encriptados");
      }

      const datosEncriptados = await response.text();
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
    console.error("Error de acceso:", error);
    if (
      error.message.includes("Clave incorrecta") ||
      error.message.includes("desencriptar")
    ) {
      mostrarFeedback(
        loginFeedback,
        "Clave de acceso incorrecta. Intente nuevamente.",
        "danger"
      );
    } else {
      mostrarFeedback(loginFeedback, error.message, "danger");
    }
    document.getElementById("claveAcceso").value = "";
    document.getElementById("claveAcceso").focus();
  }
}

// Función para verificar token GitHub
async function verificarTokenGitHub(token) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${CONFIG_LOGIN.GITHUB.OWNER}/${CONFIG_LOGIN.GITHUB.REPO}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token inválido: ${errorData.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error verificando token:", error);
    throw new Error("Token de GitHub inválido o sin permisos");
  }
}

// Función para guardar datos encriptados en GitHub
async function guardarEnGitHub(datosEncriptados, token, mensajeCommit) {
    try {
        // 1. Obtener el archivo actual (si existe)
        let sha = null;
        try {
            const getResponse = await fetch(
                `https://api.github.com/repos/${CONFIG_LOGIN.GITHUB.OWNER}/${CONFIG_LOGIN.GITHUB.REPO}/contents/json/datos-basicos-encriptado.json`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                }
            );
            
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
        } catch (error) {
            console.log('Archivo no existe, se creará nuevo');
        }
        
        // 2. CORRECCIÓN: Los datos ya están en base64, NO hacer doble encoding
        // GitHub espera el contenido en base64, pero seguridad.encriptar ya devuelve base64
        const updateResponse = await fetch(
            `https://api.github.com/repos/${CONFIG_LOGIN.GITHUB.OWNER}/${CONFIG_LOGIN.GITHUB.REPO}/contents/json/datos-basicos-encriptado.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    message: mensajeCommit,
                    content: datosEncriptados, // YA está en base64, no usar btoa()
                    sha: sha,
                    branch: CONFIG_LOGIN.GITHUB.BRANCH
                })
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`Error al guardar en GitHub: ${updateResponse.status} - ${errorData.message}`);
        }

        return await updateResponse.json();
        
    } catch (error) {
        console.error('Error guardando en GitHub:', error);
        throw error;
    }
}

// Función para procesar cambio de clave
async function procesarCambioClave(claveActual, nuevaClave, tokenGitHub) {
  try {
    mostrarFeedback(
      feedbackCambiarClave,
      "Verificando token GitHub...",
      "info",
      true
    );

    // 1. Verificar token GitHub
    await verificarTokenGitHub(tokenGitHub);

    // 2. Verificar que la clave actual es correcta
    mostrarFeedback(
      feedbackCambiarClave,
      "Verificando clave actual...",
      "info",
      true
    );
    const response = await fetch("json/datos-basicos-encriptado.json");
    if (!response.ok) {
      throw new Error("No se pudieron cargar los datos encriptados");
    }

    const datosEncriptados = await response.text();
    const datos = await seguridad.desencriptar(datosEncriptados, claveActual);

    // 3. Re-encriptar datos con la nueva clave
    mostrarFeedback(
      feedbackCambiarClave,
      "Re-encriptando datos con nueva clave...",
      "info",
      true
    );
    const nuevosDatosEncriptados = await seguridad.encriptar(datos, nuevaClave);

    // 4. Guardar los nuevos datos encriptados en GitHub
    mostrarFeedback(
      feedbackCambiarClave,
      "Guardando datos en GitHub...",
      "info",
      true
    );
    await guardarEnGitHub(
      nuevosDatosEncriptados,
      tokenGitHub,
      `Migración de seguridad: Cambio de clave de acceso`
    );

    mostrarFeedback(
      feedbackCambiarClave,
      "✅ Clave cambiada exitosamente!<br><small>Los datos han sido migrados al nuevo encriptado y guardados en GitHub.</small>",
      "success"
    );

    // Limpiar formulario
    formCambiarClave.reset();

    // Cerrar sección después de éxito
    setTimeout(() => {
      formCambiarClave.style.display = "none";
      toggleCambiarClave.innerHTML = '<i class="bi bi-arrow-down-short"></i>';
      feedbackCambiarClave.innerHTML = "";
    }, 4000);

    console.log(
      "🔐 Migración completada - Nueva clave aplicada y guardada en GitHub"
    );
  } catch (error) {
    console.error("Error cambiando clave:", error);
    if (
      error.message.includes("Clave incorrecta") ||
      error.message.includes("desencriptar")
    ) {
      mostrarFeedback(
        feedbackCambiarClave,
        "La clave actual es incorrecta",
        "danger"
      );
    } else if (error.message.includes("Token inválido")) {
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
document.addEventListener("DOMContentLoaded", inicializarLogin);
