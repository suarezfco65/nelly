const datosBasicos = {
  // Configuración para GitHub
  GITHUB_CONFIG: {
    OWNER: "suarezfco65",
    REPO: "nelly",
    BRANCH: "main",
    FILE_PATH: "json/datos-basicos.json",
  },

  // Datos actuales y estado
  datosActuales: null,
  tokenActual: null,

  // Función para cargar datos básicos desde JSON
  async cargarDatos() {
    try {
      const response = await fetch(CONFIG.JSON_URL);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const datos = await response.json();
      this.datosActuales = datos;
      this.mostrarDatosOcultos(datos);
    } catch (error) {
      console.error("Error cargando datos:", error);
      this.mostrarError("Error al cargar los datos básicos: " + error.message);
    }
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
            <li>${p.pregunta} <strong class="masked sensitive" data-value="${
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

  // Función para solicitar token antes de mostrar formulario
  async solicitarTokenModificacion() {
    const feedback = document.getElementById("datosContent");

    // Solicitar token de GitHub
    const githubToken = prompt(
      "Ingrese su Fine-Grained Token de GitHub para modificar los datos:"
    );
    if (!githubToken) {
      return;
    }

    try {
      // Mostrar mensaje de verificación
      feedback.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Verificando token...</span>
          </div>
          <p class="mt-2">Verificando token...</p>
        </div>
      `;

      // Verificar token
      const tokenValido = await this.verificarToken(githubToken);
      if (!tokenValido) {
        throw new Error("Token inválido o sin permisos suficientes");
      }

      // Guardar token para usar en el guardado
      this.tokenActual = githubToken;

      // Mostrar formulario con datos revelados
      this.mostrarFormularioModificacion();
    } catch (error) {
      console.error("Error verificando token:", error);
      this.mostrarError(`Error al verificar token: ${error.message}`);
      // Recargar datos ocultos
      setTimeout(() => {
        this.mostrarDatosOcultos(this.datosActuales);
      }, 3000);
    }
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
                  <label for="modPregunta${index}" class="form-label">${p.pregunta}</label>
                  <input type="text" class="form-control" id="modPregunta${index}" value="${p.respuesta}" required>
                  <div class="form-text">Respuesta actual: <code>${p.respuesta}</code></div>
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

  // Función para manejar la modificación de datos (SIN solicitar token nuevamente)
  async manejarModificacion(event) {
    event.preventDefault();

    const feedback = document.getElementById("feedbackModificacion");

    try {
      feedback.innerHTML =
        '<div class="alert alert-info">Guardando cambios en GitHub...</div>';

      // Verificar que tenemos token
      if (!this.tokenActual) {
        throw new Error(
          "Token no disponible. Por favor, inicie el proceso de modificación nuevamente."
        );
      }

      // Obtener datos del formulario
      const datosModificados = this.obtenerDatosFormulario();

      // Guardar en GitHub usando el token actual
      await this.guardarEnGitHub(datosModificados, this.tokenActual);

      feedback.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ Datos actualizados exitosamente</strong><br>
          <small>La página se recargará en 3 segundos...</small>
        </div>
      `;

      // Actualizar datos locales y recargar
      this.datosActuales = datosModificados;
      setTimeout(() => {
        location.reload();
      }, 3000);
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

  // Función para verificar token
  async verificarToken(githubToken) {
    try {
      const tokenLimpio = githubToken.trim();

      if (!tokenLimpio.startsWith("github_pat_")) {
        throw new Error("Formato de token incorrecto");
      }

      const response = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`,
        {
          headers: {
            Authorization: `Bearer ${tokenLimpio}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Error verificando token:", error);
      return false;
    }
  },

  // Función para guardar en GitHub
  async guardarEnGitHub(datosModificados, githubToken) {
    try {
      const tokenLimpio = githubToken.trim();

      // 1. Obtener el archivo actual
      const getResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          headers: {
            Authorization: `Bearer ${tokenLimpio}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!getResponse.ok) {
        const errorData = await getResponse.json();
        throw new Error(
          `Error al obtener archivo: ${getResponse.status} - ${errorData.message}`
        );
      }

      const fileData = await getResponse.json();

      // 2. Actualizar el archivo en GitHub
      const updateResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokenLimpio}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            message: `Actualizar datos básicos de ${datosModificados.nombre}`,
            content: btoa(JSON.stringify(datosModificados, null, 2)),
            sha: fileData.sha,
            branch: this.GITHUB_CONFIG.BRANCH,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(
          `Error al actualizar: ${updateResponse.status} - ${errorData.message}`
        );
      }

      console.log("✓ Datos básicos actualizados exitosamente");
      return await updateResponse.json();
    } catch (error) {
      console.error("Error en guardarEnGitHub:", error);

      if (error.message.includes("401")) {
        throw new Error("Token inválido o expirado");
      } else if (error.message.includes("403")) {
        throw new Error("Token sin permisos de escritura");
      } else if (error.message.includes("404")) {
        throw new Error("Repositorio o archivo no encontrado");
      } else {
        throw new Error(`Error al guardar: ${error.message}`);
      }
    }
  },

  // Inicializar pestaña de datos básicos
  inicializar() {
    this.cargarDatos();
    console.log('Pestaña "Datos Básicos" inicializada');
  },
};
