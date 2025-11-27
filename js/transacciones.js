// js/transacciones.js - PARTE SUPERIOR CORREGIDA
const transacciones = {
  listaTransacciones: [],
  tasasDolar: [],
  ultimaTasa: null,
  container: null,
  formatoNumero: new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),

  async inicializar() {
    this.container = document.getElementById("transaccionesContent");
    this.inicializarEventos();
    await this.cargarTransacciones();
  },
  // --- API Dólar ---
  async obtenerTasasDolar() {
    try {
      const response = await fetch(
        "https://api.dolarvzla.com/public/exchange-rate/list"
      );
      if (!response.ok) throw new Error("Error API Dolar");
      const datos = await response.json();

      if (datos.rates && Array.isArray(datos.rates)) {
        this.tasasDolar = datos.rates
          .filter((t) => t.usd && t.date)
          .map((t) => ({ fecha: t.date, tasa: parseFloat(t.usd) }))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (this.tasasDolar.length > 0)
          this.ultimaTasa = this.tasasDolar[0].tasa;
      }
    } catch (error) {
      console.warn("Error obteniendo tasas dólar:", error);
      this.ultimaTasa = 40.0; // Fallback
    }
  },

  obtenerTasaCambio(fecha) {
    return (
      this.tasasDolar.find((t) => t.fecha === fecha)?.tasa ||
      this.tasasDolar[this.tasasDolar.findIndex((t) => t.fecha > fecha) - 1]
        ?.tasa ||
      this.tasasDolar[this.tasasDolar.length - 1]?.tasa
    );
  },

  convertirBsADolares(montoBs, fecha) {
    return montoBs / this.obtenerTasaCambio(fecha);
  },

  // --- Carga y Renderizado ---
  async cargarTransacciones() {
    try {
      await this.obtenerTasasDolar();
      // USAR LA RUTA CORRECTA DEL NUEVO CONFIG
      const url = `https://raw.githubusercontent.com/${CONFIG.GITHUB.OWNER}/${CONFIG.GITHUB.REPO}/${CONFIG.GITHUB.BRANCH}/${CONFIG.PATHS.TRANSACCIONES}`;
      const response = await fetch(`${url}?t=${Date.now()}`);

      if (response.ok) {
        const datos = await response.json();
        this.listaTransacciones = datos.transacciones || [];
      } else {
        this.listaTransacciones = [];
      }
      this.renderizarUI();
    } catch (error) {
      console.error("Error cargando transacciones:", error);
      this.mostrarError("Error cargando datos.");
    }
  },

  // --- Lógica del Formulario ---
  /**
   * Muestra/Oculta el formulario de transacción y solicita el token si es necesario.
   */
  toggleFormulario() {
    const form = document.getElementById("formTransaccion");
    const btn = document.getElementById("mostrarFormTransaccion");

    // 1. Si el formulario está oculto, intentaremos mostrarlo
    if (form.style.display === "none" || form.style.display === "") {
      // CRÍTICO: Verificar si el token existe
      if (!seguridad.gestionarTokens.tokenExiste()) {
        try {
          // Si no hay token en sessionStorage, se pide directamente mediante prompt.
          // La función obtenerToken de github.js se encargará de solicitarlo y guardarlo.
          const token = github.obtenerToken(
            true, // Solicitar si falta
            "agregar una transacción"
          );
          if (!token) {
            // Si el usuario cancela el prompt, no hacemos nada y salimos.
            alert(
              "Debe proporcionar un Token de GitHub para poder agregar transacciones."
            );
            return;
          }
        } catch (e) {
          // Esto solo ocurre si github.js falla.
          console.error("Error al obtener token:", e);
          return;
        }
      }

      // Si el token ya existe o el usuario lo acaba de ingresar:
      form.style.display = "block";
      btn.style.display = "none";
      document.getElementById("fecha").value = new Date()
        .toISOString()
        .split("T")[0];
    } else {
      // 2. Si el formulario está visible, lo ocultamos
      form.style.display = "none";
      btn.style.display = "block";
    }
  },

  async manejarEnvioFormulario(e) {
    e.preventDefault();
    const feedback = document.getElementById("feedbackTransaccion");

    try {
      const monto = parseFloat(document.getElementById("monto").value);
      const descripcion = document.getElementById("descripcion").value;
      const tipo = document.getElementById("tipo").value;
      const fecha = document.getElementById("fecha").value;

      if (!monto || !descripcion) {
        feedback.innerHTML = `<div class="alert alert-warning">Monto y descripción son obligatorios.</div>`;
        return;
      }

      feedback.innerHTML = `<div class="alert alert-info"><span class="spinner-border spinner-border-sm"></span> Guardando en GitHub...</div>`;

      // 🛑 Eliminamos la verificación de token de aquí, ya que se hizo en toggleFormulario.
      // Ahora solo verificamos que la clave de encriptación exista.
      const claveAcceso = sessionStorage.getItem("claveAcceso");
      if (!claveAcceso) {
        throw new Error(
          "Clave de encriptación no encontrada. Por favor, reinicie la sesión."
        );
      }

      // --- Lógica de la Transacción ---

      // 1. Obtener el saldo anterior
      const saldoAnterior =
        this.listaTransacciones.length > 0
          ? this.listaTransacciones[0].saldo
          : 0;

      // 2. Calcular el nuevo saldo y el monto real
      let montoReal = 0;
      let nuevoSaldo = saldoAnterior;

      if (tipo === "ingreso") {
        montoReal = monto;
        nuevoSaldo += monto;
      } else {
        montoReal = monto;
        nuevoSaldo -= monto;
      }

      const nuevaTx = {
        fecha,
        descripcion,
        ingreso: tipo === "ingreso" ? montoReal : 0,
        egreso: tipo === "egreso" ? montoReal : 0,
        saldo: nuevoSaldo,
        timestamp: Date.now(),
      };

      // 3. Agregar a la lista local (al principio)
      this.listaTransacciones.unshift(nuevaTx);

      // 4. Preparar el JSON completo
      const contenidoJSON = JSON.stringify(
        { transacciones: this.listaTransacciones },
        null,
        2
      );

      // 5. Convertir a Base64 (UTF-8 safe)
      // Usamos btoa(unescape(encodeURIComponent())) para manejar caracteres especiales
      const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoJSON)));

      // 6. Usar github.js para guardar (usa el token que ya está en sessionStorage)
      await github.guardarArchivo(
        CONFIG.PATHS.TRANSACCIONES,
        contenidoBase64,
        `Tx: ${descripcion}`
      );

      feedback.innerHTML = `<div class="alert alert-success">Guardado correctamente.</div>`;

      // Limpiar y recargar UI
      document.getElementById("nuevaTransaccionForm").reset();
      this.renderizarUI();
      setTimeout(() => {
        this.toggleFormulario();
        feedback.innerHTML = "";
      }, 2000);
    } catch (error) {
      console.error("Error al enviar transacción:", error);
      // Si hay error, revertimos el cambio local (opcional, pero buena práctica)
      this.listaTransacciones.shift();
      feedback.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  mostrarError(msg) {
    this.container.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
  },

  actualizarBotonToken() {
    // Solo visual, para indicar si hay sesión
    const btn = document.getElementById("mostrarFormTransaccion");
    if (btn && seguridad.gestionarTokens.tokenExiste()) {
      btn.classList.replace("btn-primary", "btn-success");
      btn.innerHTML =
        '<i class="bi bi-plus-lg"></i> Agregar Transacción (Sesión Activa)';
    }
  },

  renderizarUI() {
    /* Usar la versión anterior que te pasé en el mensaje previo */
    // ... (Código de renderizado de tabla que te di en el mensaje anterior)
    // Como referencia rápida para que no falte:
    const saldo = this.listaTransacciones.reduce(
      (acc, t) => (t.ingreso > 0 ? acc + t.ingreso : acc - t.egreso),
      0
    );
    // let html = `<div class="alert ${saldo>0?'alert-success':'alert-danger'}">Saldo: Bs ${this.formatoNumero.format(saldo)}</div>`;
    let html = `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Fecha</th><th>Descripción</th><th class="text-end">Monto Bs</th><th class="text-end">Saldo Bs</th></tr></thead><tbody>`;
    this.listaTransacciones.slice(0, 10).forEach((t) => {
      t.monto = t.ingreso > 0 ? t.ingreso : -t.egreso;
      const dolares = this.convertirBsADolares(t.monto, t.fecha);
      const tasa = t.monto / dolares;
      html += `<tr><td>${t.fecha}</td><td>${t.descripcion}</td><td title="${
        dolares ? "$" + this.formatoNumero.format(dolares) : "-"
      } (tasa: Bs${this.formatoNumero.format(tasa)} por $)" class="${
        t.ingreso > 0 ? "text-success" : "text-danger"
      } text-end">${this.formatoNumero.format(t.monto)}</td><td class="${
        t.saldo > 0 ? "text-body" : "text-danger"
      } text-end">${this.formatoNumero.format(t.saldo)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    this.container.innerHTML = html;
  },
  inicializarEventos() {
    document
      .getElementById("mostrarFormTransaccion")
      ?.addEventListener("click", () => this.toggleFormulario());
    document
      .getElementById("nuevaTransaccionForm")
      ?.addEventListener("submit", (e) => this.manejarEnvioFormulario(e));
    document
      .getElementById("cancelarTransaccion")
      ?.addEventListener("click", () => this.toggleFormulario());
  },
};
