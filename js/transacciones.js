// js/transacciones.js
const transacciones = {
  listaTransacciones: [],
  tasasDolar: [],
  ultimaTasa: null,
  container: null,
  formatoNumero: new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

  // --- Inicialización ---
  async inicializar() {
    this.container = document.getElementById("transaccionesContent");
    this.inicializarEventos();
    await this.cargarTransacciones();
    console.log('Pestaña "Transacciones" inicializada');
  },

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
      
      // Intentamos cargar desde GitHub (raw) para tener lo más reciente
      const url = `https://raw.githubusercontent.com/${CONFIG.GITHUB.OWNER}/${CONFIG.GITHUB.REPO}/${CONFIG.GITHUB.BRANCH}/${CONFIG.PATHS.TRANSACCIONES}`;
      
      // Timestamp para evitar caché del navegador
      const response = await fetch(`${url}?t=${Date.now()}`);
      
      if (response.ok) {
        const datos = await response.json();
        this.listaTransacciones = datos.transacciones || [];
      } else {
        console.warn("No se encontró archivo de transacciones, iniciando vacío.");
        this.listaTransacciones = [];
      }
      
      this.renderizarUI();
    } catch (error) {
      console.error("Error cargando transacciones:", error);
      this.mostrarError("No se pudieron cargar las transacciones.");
    }
  },

  renderizarUI() {
    // Cálculo de saldo total
    const saldoTotal = this.listaTransacciones.reduce((acc, t) => {
        return t.tipo === 'ingreso' ? acc + t.monto : acc - t.monto;
    }, 0);

    const ultimas = this.listaTransacciones.slice(0, 10); // Mostrar solo las últimas 10

    let html = `
        <div class="row mb-3">
            <div class="col-md-4">
                <div class="card bg-light border-primary">
                    <div class="card-body text-center py-2">
                        <small class="text-muted">Saldo Total</small>
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
            const esIngreso = t.tipo === 'ingreso';
            const dolares = this.convertirBsADolares(t.monto, t.fecha);
            html += `
                <tr>
                    <td>${t.fecha}</td>
                    <td>${t.descripcion}</td>
                    <td class="text-end ${esIngreso ? 'text-success' : 'text-danger'}">
                        ${esIngreso ? '+' : '-'} ${this.formatoNumero.format(t.monto)}
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

  // --- Lógica del Formulario ---
  toggleFormulario() {
    const form = document.getElementById('formTransaccion');
    const btn = document.getElementById('mostrarFormTransaccion');
    
    if (form.style.display === 'none') {
        if (!seguridad.gestionarTokens.tokenExiste()) {
             // Si no hay token, pedirlo usando la función central de github.js
             const token = github.obtenerToken(true, "agregar transacciones");
             if(!token) return;
        }
        form.style.display = 'block';
        btn.style.display = 'none';
        document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
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

        feedback.innerHTML = `<div class="alert alert-info"><span class="spinner-border spinner-border-sm"></span> Guardando en GitHub...</div>`;

        const nuevaTx = {
            fecha,
            descripcion,
            tipo,
            monto,
            timestamp: Date.now()
        };

        // 1. Agregar a la lista local (al principio)
        this.listaTransacciones.unshift(nuevaTx);

        // 2. Preparar el JSON completo
        const contenidoJSON = JSON.stringify({ transacciones: this.listaTransacciones }, null, 2);
        
        // 3. Convertir a Base64 (UTF-8 safe)
        const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoJSON)));

        // 4. Usar github.js para guardar (Usando la RUTA CORRECTA)
        // Nota: Pasamos null en SHA para forzar que github.js busque el SHA actual antes de guardar
        await github.guardarArchivo(
            CONFIG.PATHS.TRANSACCIONES, 
            contenidoBase64, 
            `Nueva transacción: ${descripcion}`
        );

        feedback.innerHTML = `<div class="alert alert-success">Guardado correctamente.</div>`;
        
        // Limpiar y recargar UI
        document.getElementById('nuevaTransaccionForm').reset();
        this.renderizarUI();
        setTimeout(() => {
            this.toggleFormulario();
            feedback.innerHTML = '';
        }, 2000);

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
  }
};
