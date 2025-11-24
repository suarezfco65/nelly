const datosBasicos = {
  // Configuración para GitHub (ELIMINADA: ahora usa el objeto global CONFIG)

  // Datos actuales y estado
  datosActuales: null,
  tokenActual: null,

  // Función para cargar datos básicos desde JSON
  async cargarDatos() {
    try {
      const claveAcceso = sessionStorage.getItem("claveAcceso");
      if (!claveAcceso) {
        this.redirigirALogin();
        return;
      }

      // Intentar cargar datos encriptados primero
      try {
        // Usa la ruta centralizada de CONFIG
        const responseEncriptado = await fetch(CONFIG.DATOS_ENCRIPTADOS_PATH);
        if (responseEncriptado.ok) {
          const datosEncriptados = await responseEncriptado.text();
          // seguridad.js es un módulo que ya existe y se asume global
          const datos = await seguridad.desencriptar(
            datosEncriptados,
            claveAcceso
          );
          this.datosActuales = datos;
          this.mostrarDatosOcultos(datos);
          return;
        }
      } catch (errorEncriptado) {
        console.log(
          "No hay datos encriptados o clave incorrecta (intentando cargar archivo no encriptado):",
          errorEncriptado
        );
      }

      // Si no hay datos encriptados, cargar datos normales
      // Usa la ruta centralizada de CONFIG
      const response = await fetch(CONFIG.JSON_URL);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const datos = await response.json();
      this.datosActuales = datos;
      this.mostrarDatosOcultos(datos);
    } catch (error) {
      console.error("Error cargando datos:", error);

      // Si es error de desencriptación, redirigir al login
      if (
        error.message.includes("Clave incorrecta") ||
        error.message.includes("desencriptar")
      ) {
        this.mostrarError(
          "Clave de acceso incorrecta. Redirigiendo al login..."
        );
        setTimeout(() => {
          this.redirigirALogin();
        }, 2000);
      } else {
        this.mostrarError(
          "Error al cargar los datos básicos: " + error.message
        );
      }
    }
  },

  // Función para redirigir al login
  redirigirALogin() {
    sessionStorage.removeItem("claveAcceso"); // Limpiar clave inválida
    // Usa la ruta centralizada de CONFIG
    window.location.href = CONFIG.LOGIN_URL;
  },

  // Función para mostrar datos OCULTOS (inicial)
  mostrarDatosOcultos(datos) {
    const contenido = `
      <div class="mb-4">
        <p class="mb-1"><strong>Nombre:</strong> ${datos.nombre}</p>
        <p class="mb-3"><strong>Cédula de Identidad:</strong> ${
          datos.cedula
        }</p>

        <hr />

        <h5>Acceso a sistema Patria</h5>
        <p><strong>Contraseña:</strong> <span class="masked sensitive" data-value="${
          datos.accesos.patria.contrasena
        }">••••••••</span></p>

        <h5 class="mt-4">Acceso Bancaribe</h5>
        <p><strong>Usuario:</strong> ${datos.accesos.bancaribe.usuario}</p>
        <p><strong>Contraseña:</strong> <span class="masked sensitive" data-value="${
          datos.accesos.bancaribe.contrasena
        }">••••••••</span></p>

        <h5 class="mt-4">Acceso Banco Mercantil</h5>
        <p><strong>Usuario:</strong> ${datos.accesos.mercantil.usuario}</p>
        <p><strong>Contraseña:</strong> <span class="masked sensitive" data-value="${
          datos.accesos.mercantil.contrasena
        }">••••••••</span></p>

        <hr />

        <h5>Preguntas de seguridad (respuestas en minúsculas)</h5>
        <ul>
          ${datos.preguntasSeguridad
            .map(
              (p) => `
            <li>${p.pregunta
              .replace(/¿/g, "¿")
              .replace(
                /¡/g,
                "¡"
              )} <strong class="masked sensitive" data-value="${
                p.respuesta
              }">${"•".repeat(p.respuesta.length)}</strong></li>
          `
            )
            .join("")}
        </ul>
      </div>

      <div class="mt-4">
        <button id="btnModificarDatos" class="btn btn-warning">
          <i class="bi bi-pencil-square"></i> Modificar Datos
        </button>
      </div>
    `;

    // elements es un objeto global asumido de app.js
    elements.datosContent.innerHTML = contenido;
    this.inicializarEventosModificacion();
  },

  // Función para mostrar error
  mostrarError(mensaje) {
    elements.datosContent.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${mensaje}
      </div>
    `;
  },

  // Función para inicializar eventos de modificación
  inicializarEventosModificacion() {
    const btnModificar = document.getElementById("btnModificarDatos");
    if (btnModificar) {
      btnModificar.addEventListener("click", () => {
        this.solicitarTokenModificacion();
      });
    }
  },

  // Función para solicitar token antes de mostrar formulario (USA MODAL)
  async solicitarTokenModificacion() {
    this.mostrarModalToken();
  },

  // FUNCIÓN: Mostrar el modal/formulario de solicitud de token
  mostrarModalToken() {
    // Usa CONFIG.GITHUB para los mensajes
    const modalHtml = `
      <div class="modal fade" id="tokenModal" tabindex="-1" aria-labelledby="tokenModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="tokenModalLabel"><i class="bi bi-key"></i> Token de GitHub Requerido</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="formTokenModificacion">
              <div class="modal-body">
                <p>Para **modificar y guardar** los datos, ingrese su **Fine-Grained Token** de GitHub. Este token debe tener permisos de **escritura** sobre el repositorio **${CONFIG.GITHUB.OWNER}/${CONFIG.GITHUB.REPO}**.</p>
                
                <div class="mb-3">
                  <label for="githubTokenInput" class="form-label">Token de GitHub</label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="githubTokenInput" required pattern="github_pat_.*" title="El token debe empezar con 'github_pat_'">
                    <button type="button" class="btn btn-outline-secondary password-toggle" tabindex="-1">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                  <div id="tokenFeedback" class="mt-2"></div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnVerificarToken">Verificar y Continuar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Añadir el modal al body si no existe
    if (!document.getElementById("tokenModal")) {
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      this.inicializarTogglePassword(
        document.getElementById("formTokenModificacion")
      );
    }

    // Inicializar el modal de Bootstrap
    // Se asume que bootstrap está cargado
    const tokenModalElement = document.getElementById("tokenModal");
    const tokenModalInstance = new bootstrap.Modal(tokenModalElement);

    // Limpiar feedback anterior y mostrar modal
    document.getElementById("tokenFeedback").innerHTML = "";
    tokenModalInstance.show();

    // Evento de manejo del formulario del modal
    document
      .getElementById("formTokenModificacion")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        const githubToken = document
          .getElementById("githubTokenInput")
          .value.trim();
        this.manejarVerificacionToken(githubToken, tokenModalInstance);
      });
  },

  // FUNCIÓN: Manejar la verificación del token y mostrar feedback
  async manejarVerificacionToken(githubToken, modalInstance) {
    const feedback = document.getElementById("tokenFeedback");
    const btnVerificar = document.getElementById("btnVerificarToken");

    try {
      btnVerificar.disabled = true;
      feedback.innerHTML = `
        <div class="alert alert-info py-2">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          Verificando token...
        </div>
      `;

      // USA github.js para la verificación
      await github.verificarToken(githubToken);

      // Éxito: Guardar token, cerrar modal y mostrar formulario de modificación
      this.tokenActual = githubToken;
      feedback.innerHTML = `<div class="alert alert-success py-2">Token verificado ✓</div>`;

      setTimeout(() => {
        modalInstance.hide();
        this.mostrarFormularioModificacion();
      }, 500);
    } catch (error) {
      console.error("Error verificando token:", error);
      // github.js ya proporciona un mensaje de error detallado
      feedback.innerHTML = `<div class="alert alert-danger py-2">Error: ${error.message}</div>`;
      btnVerificar.disabled = false;
    }
  },

  // FUNCIÓN: Inicializar el toggle de password para el modal
  inicializarTogglePassword(formElement) {
    formElement.querySelectorAll(".password-toggle").forEach((toggle) => {
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
  },

  // Función para mostrar formulario de modificación con datos REVELADOS
  mostrarFormularioModificacion() {
    const datos = this.datosActuales;

    const formulario = `
      <div class="card border-warning">
        <div class="card-header bg-warning text-dark">
          <h5 class="mb-0">
            <i class="bi bi-pencil-square"></i> Modificar Datos Básicos
            <small class="text-muted float-end">Token verificado ✓</small>
          </h5>
        </div>
        <div class="card-body">
          <form id="formModificarDatos">
            <div class="row mb-3">
              <div class="col-md-6">
                <label for="modNombre" class="form-label">Nombre</label>
                <input type="text" class="form-control" id="modNombre" value="${
                  datos.nombre
                }" required>
              </div>
              <div class="col-md-6">
                <label for="modCedula" class="form-label">Cédula</label>
                <input type="text" class="form-control" id="modCedula" value="${
                  datos.cedula
                }" required>
              </div>
            </div>

            <h6 class="mt-4 border-bottom pb-2">Accesos a Sistemas</h6>
            
            <div class="row mb-3">
              <div class="col-md-12">
                <label for="modPatriaPass" class="form-label">Contraseña Patria</label>
                <input type="text" class="form-control" id="modPatriaPass" value="${
                  datos.accesos.patria.contrasena
                }" required>
                <div class="form-text">Contraseña actual: <code>${
                  datos.accesos.patria.contrasena
                }</code></div>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="modBancaribeUser" class="form-label">Usuario Bancaribe</label>
                <input type="text" class="form-control" id="modBancaribeUser" value="${
                  datos.accesos.bancaribe.usuario
                }" required>
              </div>
              <div class="col-md-6">
                <label for="modBancaribePass" class="form-label">Contraseña Bancaribe</label>
                <input type="text" class="form-control" id="modBancaribePass" value="${
                  datos.accesos.bancaribe.contrasena
                }" required>
                <div class="form-text">Contraseña actual: <code>${
                  datos.accesos.bancaribe.contrasena
                }</code></div>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="modMercantilUser" class="form-label">Usuario Mercantil</label>
                <input type="text" class="form-control" id="modMercantilUser" value="${
                  datos.accesos.mercantil.usuario
                }" required>
              </div>
              <div class="col-md-6">
                <label for="modMercantilPass" class="form-label">Contraseña Mercantil</label>
                <input type="text" class="form-control" id="modMercantilPass" value="${
                  datos.accesos.mercantil.contrasena
                }" required>
                <div class="form-text">Contraseña actual: <code>${
                  datos.accesos.mercantil.contrasena
                }</code></div>
              </div>
            </div>

            <h6 class="mt-4 border-bottom pb-2">Preguntas de Seguridad</h6>
            
            ${datos.preguntasSeguridad
              .map(
                (p, index) => `
              <div class="row mb-3">
                <div class="col-md-12">
                  <label for="modPregunta${index}" class="form-label">${p.pregunta
                  .replace(/¿/g, "¿")
                  .replace(/¡/g, "¡")}</label>
                  <input type="text" class="form-control" id="modPregunta${index}" value="${
                  p.respuesta
                }" required>
                  <div class="form-text">Respuesta actual: <code>${
                    p.respuesta
                  }</code></div>
                </div>
              </div>
            `
              )
              .join("")}

            <div class="mt-4 p-3 bg-light rounded">
              <small class="text-muted">
                <i class="bi bi-info-circle"></i> 
                Los datos sensibles ahora son visibles porque el token de GitHub ha sido verificado.
                Al guardar, los cambios se actualizarán directamente en el repositorio.
              </small>
            </div>

            <div class="mt-4">
              <button type="submit" class="btn btn-success">
                <i class="bi bi-check-circle"></i> Guardar Cambios
              </button>
              <button type="button" id="btnCancelarModificacion" class="btn btn-secondary">
                <i class="bi bi-x-circle"></i> Cancelar
              </button>
            </div>
          </form>
          <div id="feedbackModificacion" class="mt-3"></div>
        </div>
      </div>
    `;

    elements.datosContent.innerHTML = formulario;

    // Inicializar eventos del formulario
    document
      .getElementById("formModificarDatos")
      .addEventListener("submit", (e) => {
        this.manejarModificacion(e);
      });

    document
      .getElementById("btnCancelarModificacion")
      .addEventListener("click", () => {
        // Volver a mostrar datos ocultos
        this.mostrarDatosOcultos(this.datosActuales);
        this.tokenActual = null; // Limpiar token
      });
  },

  // Función para manejar la modificación de datos
  async manejarModificacion(event) {
    event.preventDefault();

    const feedback = document.getElementById("feedbackModificacion");

    try {
      feedback.innerHTML = `
        <div class="alert alert-info">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Guardando...</span>
          </div>
          Guardando cambios en GitHub...
        </div>
      `;

      if (!this.tokenActual) {
        throw new Error(
          "Token no disponible. Por favor, inicie el proceso de modificación nuevamente."
        );
      }

      const datosModificados = this.obtenerDatosFormulario();

      // Guardar en GitHub usando el token actual
      await this.guardarEnGitHub(datosModificados, this.tokenActual);

      // Feedback simplificado y directo (eliminando el polling)
      feedback.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ Datos actualizados exitosamente</strong><br>
          <small>El cambio ha sido enviado a GitHub. La página se recargará en 2 segundos...</small>
        </div>
      `;

      // Actualizar datos locales y recargar
      this.datosActuales = datosModificados;
      setTimeout(() => {
        location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error modificando datos:", error);
      feedback.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error al guardar:</strong> ${error.message}<br>
          <small>Verifique la conexión y permisos</small>
        </div>
      `;
    }
  },

  // Función para obtener datos del formulario
  obtenerDatosFormulario() {
    const datos = this.datosActuales;

    return {
      nombre: document.getElementById("modNombre").value,
      cedula: document.getElementById("modCedula").value,
      accesos: {
        patria: {
          usuario: datos.accesos.patria.usuario, // Mantener usuario si no está en el form
          contrasena: document.getElementById("modPatriaPass").value,
        },
        bancaribe: {
          usuario: document.getElementById("modBancaribeUser").value,
          contrasena: document.getElementById("modBancaribePass").value,
        },
        mercantil: {
          usuario: document.getElementById("modMercantilUser").value,
          contrasena: document.getElementById("modMercantilPass").value,
        },
      },
      preguntasSeguridad: datos.preguntasSeguridad.map((p, index) => ({
        pregunta: p.pregunta,
        respuesta: document.getElementById(`modPregunta${index}`).value,
      })),
    };
  },

  // Función para verificar token (ELIMINADA: ahora se usa github.verificarToken)

  // Función para guardar en GitHub (REFACTORIZADA PARA USAR github.js)
  async guardarEnGitHub(datosModificados, githubToken) {
    try {
      const claveAcceso = sessionStorage.getItem("claveAcceso");
      if (!claveAcceso) {
        throw new Error("No hay clave de acceso");
      }

      // 1. Encriptar datos antes de guardar
      const datosEncriptados = await seguridad.encriptar(
        datosModificados,
        claveAcceso
      );

      // 2. Definir mensaje de commit
      const commitMessage = `Actualizar datos básicos encriptados de ${datosModificados.nombre}`;

      // 3. USAR github.js para la interacción con la API
      // github.js se encarga de obtener el SHA y realizar el PUT.
      await github.guardarArchivo(
        CONFIG.DATOS_ENCRIPTADOS_PATH,
        datosEncriptados,
        githubToken,
        commitMessage
      );

      console.log("✓ Datos encriptados guardados exitosamente");
    } catch (error) {
      console.error("Error en guardarEnGitHub:", error);
      // github.js ya lanza errores detallados.
      throw error;
    }
  },

  // datosBasicos.esperarCommit() ha sido eliminado

  // Inicializar pestaña de datos básicos
  inicializar() {
    this.cargarDatos();
    console.log('Pestaña "Datos Básicos" inicializada');
  },
};
