// js/transacciones.js - PARTE SUPERIOR CORREGIDA
const transacciones = {
  listaTransacciones: [],
  tasasDolar: [],
  ultimaTasa: null,
  container: null,
  formatoNumero: new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

  async inicializar() {
    this.container = document.getElementById("transaccionesContent");
    this.inicializarEventos();
    await this.cargarTransacciones();
  },
/*
  inicializarEventos() {
    const btnMostrar = document.getElementById('mostrarFormTransaccion');
    if (btnMostrar) {
        btnMostrar.addEventListener('click', () => this.toggleFormulario());
    }
    
    const form = document.getElementById('nuevaTransaccionForm');
    if (form) {
        form.addEventListener('submit', (e) => this.manejarEnvioFormulario(e));
    }

    document.getElementById('cancelarTransaccion')?.addEventListener('click', () => this.toggleFormulario());
  },
*/
  // --- API Dólar ---
  async obtenerTasasDolar() {
    try {
      const response = await fetch('https://api.dolarvzla.com/public/exchange-rate/list');
      if (!response.ok) throw new Error('Error API Dolar');
      const datos = await response.json();
      
      if (datos.rates && Array.isArray(datos.rates)) {
        this.tasasDolar = datos.rates
          .filter(t => t.usd && t.date)
          .map(t => ({ fecha: t.date, tasa: parseFloat(t.usd) }))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        if (this.tasasDolar.length > 0) this.ultimaTasa = this.tasasDolar[0].tasa;
      }
    } catch (error) {
      console.warn('Error obteniendo tasas dólar:', error);
      this.ultimaTasa = 40.0; // Fallback
    }
  },

  convertirBsADolares(montoBs, fecha) {
    if (!montoBs || !this.ultimaTasa) return null;
    // Lógica simplificada: usa la tasa más cercana o la actual
    const tasa = this.tasasDolar.find(t => t.fecha === fecha)?.tasa || this.ultimaTasa;
    return montoBs / tasa;
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
/*
renderizarUI() {
    // 1. Obtener el saldo actual
    // En tu JSON, el registro 0 es el más reciente, por lo que tomamos ese saldo.
    let saldoTotal = 0;
    if (this.listaTransacciones.length > 0) {
        saldoTotal = this.listaTransacciones[0].saldo;
    }

    const ultimas = this.listaTransacciones.slice(0, 10); // Mostrar solo las últimas 10

    let html = `
        <div class="row mb-3">
            <div class="col-md-4">
                <div class="card bg-light border-primary">
                    <div class="card-body text-center py-2">
                        <small class="text-muted">Saldo Actual</small>
                        <h4 class="${saldoTotal >= 0 ? 'text-success' : 'text-danger'}">Bs ${this.formatoNumero.format(saldoTotal)}</h4>
                        ${this.ultimaTasa ? `<small class="text-muted">≈ $${this.formatoNumero.format(saldoTotal / this.ultimaTasa)}</small>` : ''}
                    </div>
                </div>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-dark">
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th class="text-end">Monto (Bs)</th>
                        <th class="text-end">Ref ($)</th>
                    </tr>
                </thead>
                <tbody>`;

    if (ultimas.length === 0) {
        html += `<tr><td colspan="4" class="text-center">No hay transacciones.</td></tr>`;
    } else {
        ultimas.forEach(t => {
            // CORRECCIÓN: Detectar monto y tipo basados en tu estructura JSON
            let montoReal = 0;
            let esIngreso = false;

            // Tu JSON usa "ingreso" y "egreso" numéricos
            if (t.ingreso > 0) {
                montoReal = t.ingreso;
                esIngreso = true;
            } else {
                montoReal = t.egreso;
                esIngreso = false;
            }

            const dolares = this.convertirBsADolares(montoReal, t.fecha);
            
            html += `
                <tr>
                    <td>${t.fecha}</td>
                    <td>${t.descripcion}</td>
                    <td class="text-end ${esIngreso ? 'text-success' : 'text-danger'}">
                        ${esIngreso ? '+' : '-'} ${this.formatoNumero.format(montoReal)}
                    </td>
                    <td class="text-end text-muted small">
                        ${dolares ? '$' + this.formatoNumero.format(dolares) : '-'}
                    </td>
                </tr>`;
        });
    }

    html += `</tbody></table></div>`;
    this.container.innerHTML = html;
    this.actualizarBotonToken();
  },
*/
  // --- Lógica del Formulario ---
  toggleFormulario() {
      const form = document.getElementById('formTransaccion');
      const btn = document.getElementById('mostrarFormTransaccion');
      if (form.style.display === 'none') {
          form.style.display = 'block';
          btn.style.display = 'none';
      } else {
          form.style.display = 'none';
          btn.style.display = 'block';
      }
  },

async manejarEnvioFormulario(e) {
    e.preventDefault();
    const feedback = document.getElementById('feedbackTransaccion');
    
    try {
        const monto = parseFloat(document.getElementById('monto').value);
        const descripcion = document.getElementById('descripcion').value;
        const tipo = document.getElementById('tipo').value;
        const fecha = document.getElementById('fecha').value;

        if (!monto || !descripcion) return;

        feedback.innerHTML = `<div class="alert alert-info"><span class="spinner-border spinner-border-sm"></span> Guardando...</div>`;

        // Lógica de token
        if (!seguridad.gestionarTokens.tokenExiste()) {
             throw new Error("No hay token activo. Recargue e ingrese su token.");
        }

        const nuevaTx = { fecha, descripcion, tipo, monto, timestamp: Date.now() };
        this.listaTransacciones.unshift(nuevaTx);

        const contenidoJSON = JSON.stringify({ transacciones: this.listaTransacciones }, null, 2);
        // Base64 seguro
        const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoJSON)));

        // USAR github.js CON LA RUTA CORRECTA
        await github.guardarArchivo(
            CONFIG.PATHS.TRANSACCIONES, // <-- Aquí estaba el error antes
            contenidoBase64, 
            `Nueva transacción: ${descripcion}`
        );

        feedback.innerHTML = `<div class="alert alert-success">Guardado correctamente.</div>`;
        document.getElementById('nuevaTransaccionForm').reset();
        this.renderizarUI();
        setTimeout(() => { this.toggleFormulario(); feedback.innerHTML = ''; }, 2000);

    } catch (error) {
        console.error(error);
        feedback.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  mostrarError(msg) {
    this.container.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
  },
  
  actualizarBotonToken() {
     // Solo visual, para indicar si hay sesión
     const btn = document.getElementById('mostrarFormTransaccion');
     if(btn && seguridad.gestionarTokens.tokenExiste()) {
         btn.classList.replace('btn-primary', 'btn-success');
         btn.innerHTML = '<i class="bi bi-plus-lg"></i> Agregar Transacción (Sesión Activa)';
     }
  },

  renderizarUI() { /* Usar la versión anterior que te pasé en el mensaje previo */ 
      // ... (Código de renderizado de tabla que te di en el mensaje anterior)
      // Como referencia rápida para que no falte:
      const saldo = this.listaTransacciones.reduce((acc, t) => t.ingreso > 0 ? acc + t.ingreso : acc - t.egreso, 0);
      let html = `<div class="alert alert-secondary">Saldo: Bs ${this.formatoNumero.format(saldo)}</div>`;
      html += `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Fecha</th><th>Desc</th><th>Monto</th></tr></thead><tbody>`;
      this.listaTransacciones.slice(0,10).forEach(t => {
          t.monto = t.ingreso > 0 ? t.ingreso : -t.egreso;
          html += `<tr><td>${t.fecha}</td><td>${t.descripcion}</td><td class="${t.ingreso > 0 ? 'text-success' : 'text-danger'}">${this.formatoNumero.format(t.monto)}</td></tr>`;
      });
      html += `</tbody></table></div>`;
      this.container.innerHTML = html;
  },
  inicializarEventos() {
    document.getElementById('mostrarFormTransaccion')?.addEventListener('click', () => this.toggleFormulario());
    document.getElementById('nuevaTransaccionForm')?.addEventListener('submit', (e) => this.manejarEnvioFormulario(e));
    document.getElementById('cancelarTransaccion')?.addEventListener('click', () => this.toggleFormulario());
  }
};
