const transacciones = {
  // Configuración para GitHub con Fine-Grained Token
  GITHUB_CONFIG: {
    OWNER: 'suarezfco',
    REPO: 'nelly',
    BRANCH: 'main',
    FILE_PATH: 'json/transacciones.json'
  },

  // Función para cargar transacciones desde JSON
  async cargarTransacciones() {
    try {
      const response = await fetch('json/transacciones.json');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const datos = await response.json();
      this.mostrarTransacciones(datos.transacciones);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      this.mostrarError('Error al cargar las transacciones: ' + error.message);
    }
  },

  // Función para mostrar transacciones en una tabla
  mostrarTransacciones(transacciones) {
    const ultimasTransacciones = transacciones.slice(0, 10); // Últimas 10 transacciones
    
    const contenido = `
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th class="text-end">Ingreso (Bs)</th>
              <th class="text-end">Egreso (Bs)</th>
              <th class="text-end">Saldo (Bs)</th>
            </tr>
          </thead>
          <tbody>
            ${ultimasTransacciones.map(trans => `
              <tr>
                <td>${this.formatearFecha(trans.fecha)}</td>
                <td>${trans.descripcion}</td>
                <td class="text-end text-success">${trans.ingreso > 0 ? trans.ingreso.toFixed(2) : '-'}</td>
                <td class="text-end text-danger">${trans.egreso > 0 ? trans.egreso.toFixed(2) : '-'}</td>
                <td class="text-end fw-bold ${trans.saldo >= 0 ? 'text-success' : 'text-danger'}">
                  ${trans.saldo.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-muted">
        Mostrando las últimas ${ultimasTransacciones.length} transacciones
      </div>
    `;

    document.getElementById('transaccionesContent').innerHTML = contenido;
  },

  // Función para formatear fecha
  formatearFecha(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES');
  },

  // Función para mostrar error
  mostrarError(mensaje) {
    document.getElementById('transaccionesContent').innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${mensaje}
      </div>
    `;
  },

  // Función para mostrar/ocultar formulario
  toggleFormulario() {
    const form = document.getElementById('formTransaccion');
    const boton = document.getElementById('mostrarFormTransaccion');
    
    if (form.style.display === 'none') {
      form.style.display = 'block';
      boton.textContent = 'Ocultar Formulario';
      // Establecer fecha actual por defecto
      document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    } else {
      form.style.display = 'none';
      boton.textContent = 'Agregar Nueva Transacción';
      this.limpiarFormulario();
    }
  },

  // Función para limpiar formulario
  limpiarFormulario() {
    document.getElementById('nuevaTransaccionForm').reset();
    document.getElementById('feedbackTransaccion').innerHTML = '';
  },

  // Función para manejar envío del formulario
  async manejarEnvioFormulario(event) {
    event.preventDefault();
    
    const fecha = document.getElementById('fecha').value;
    const descripcion = document.getElementById('descripcion').value;
    const tipo = document.getElementById('tipo').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const clave = document.getElementById('claveTransaccion').value;
    
    const feedback = document.getElementById('feedbackTransaccion');
    
    // Validar clave
    if (clave !== CONFIG.KEY) {
      feedback.innerHTML = '<div class="alert alert-danger">Clave incorrecta</div>';
      return;
    }
    
    // Solicitar token de GitHub
    const githubToken = prompt('Ingrese su Fine-Grained Token de GitHub:');
    if (!githubToken) {
      feedback.innerHTML = '<div class="alert alert-warning">Token requerido para guardar</div>';
      return;
    }
    
    // Crear nueva transacción
    const nuevaTransaccion = {
      fecha: fecha,
      descripcion: descripcion,
      ingreso: tipo === 'ingreso' ? monto : 0,
      egreso: tipo === 'egreso' ? monto : 0,
      saldo: 0 // Se calculará en guardarEnGitHub
    };
    
    try {
      feedback.innerHTML = '<div class="alert alert-info">Guardando transacción en GitHub...</div>';
      
      // Usar la función real de GitHub
      await this.guardarEnGitHub(nuevaTransaccion, githubToken);
      
      feedback.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ Transacción guardada exitosamente</strong><br>
          <small>La página se recargará en 3 segundos...</small>
        </div>
      `;
      
      // Recargar después de 3 segundos
      setTimeout(() => {
        location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error guardando transacción:', error);
      feedback.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error al guardar:</strong> ${error.message}<br>
          <small>Verifique el token y los permisos</small>
        </div>
      `;
    }
  },

  // Función real para guardar en GitHub con Fine-Grained Token
  async guardarEnGitHub(nuevaTransaccion, githubToken) {
    try {
      console.log('Iniciando guardado en GitHub...');
      console.log('Repo:', `${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`);
      
      // Limpiar el token de espacios en blanco
      const tokenLimpio = githubToken.trim();
      
      // 1. Primero verificar que podemos acceder al repositorio
      const testResponse = await fetch(
        `https://api.github.com/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenLimpio}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        console.error('Error acceso repo:', errorData);
        throw new Error(`No se puede acceder al repositorio: ${testResponse.status} - ${errorData.message}`);
      }

      console.log('✓ Acceso al repositorio verificado');

      // 2. Obtener el archivo actual
      const getResponse = await fetch(
        `https://api.github.com/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenLimpio}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      if (!getResponse.ok) {
        const errorData = await getResponse.json();
        console.error('Error obteniendo archivo:', errorData);
        
        // Si el archivo no existe, crear uno nuevo
        if (getResponse.status === 404) {
          console.log('Archivo no existe, creando nuevo...');
          return await this.crearNuevoArchivo(nuevaTransaccion, tokenLimpio);
        }
        
        throw new Error(`Error al obtener archivo: ${getResponse.status} - ${errorData.message}`);
      }

      const fileData = await getResponse.json();
      console.log('✓ Archivo actual obtenido');
      
      // 3. Actualizar el contenido
      const contenidoActual = JSON.parse(atob(fileData.content));
      
      // Calcular el nuevo saldo
      const saldoAnterior = contenidoActual.transacciones.length > 0 
        ? contenidoActual.transacciones[0].saldo 
        : 0;
      
      nuevaTransaccion.saldo = nuevaTransaccion.ingreso > 0 
        ? saldoAnterior + nuevaTransaccion.ingreso
        : saldoAnterior - nuevaTransaccion.egreso;
      
      // Agregar la nueva transacción al inicio
      contenidoActual.transacciones.unshift(nuevaTransaccion);
      
      // 4. Actualizar el archivo en GitHub
      const updateResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${tokenLimpio}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({
            message: `Agregar transacción: ${nuevaTransaccion.descripcion}`,
            content: btoa(JSON.stringify(contenidoActual, null, 2)),
            sha: fileData.sha,
            branch: this.GITHUB_CONFIG.BRANCH
          })
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('Error actualizando archivo:', errorData);
        throw new Error(`Error al actualizar: ${updateResponse.status} - ${errorData.message}`);
      }

      const result = await updateResponse.json();
      console.log('✓ Archivo actualizado exitosamente');
      return result;
      
    } catch (error) {
      console.error('Error completo en guardarEnGitHub:', error);
      throw error;
    }
  },

  // Función para crear nuevo archivo si no existe
  async crearNuevoArchivo(nuevaTransaccion, githubToken) {
    try {
      // Calcular saldo inicial
      nuevaTransaccion.saldo = nuevaTransaccion.ingreso > 0 
        ? nuevaTransaccion.ingreso 
        : -nuevaTransaccion.egreso;
      
      const contenidoInicial = {
        transacciones: [nuevaTransaccion]
      };
      
      const response = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({
            message: `Crear archivo de transacciones: ${nuevaTransaccion.descripcion}`,
            content: btoa(JSON.stringify(contenidoInicial, null, 2)),
            branch: this.GITHUB_CONFIG.BRANCH
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error creando archivo: ${response.status} - ${errorData.message}`);
      }

      console.log('✓ Nuevo archivo creado exitosamente');
      return await response.json();
      
    } catch (error) {
      console.error('Error en crearNuevoArchivo:', error);
      throw error;
    }
  },

  // Función para probar el token (puedes llamarla desde la consola)
  async probarToken(githubToken) {
    try {
      console.log('🔍 Probando token...');
      
      const tokenLimpio = githubToken.trim();
      console.log('Token (primeros 10 chars):', tokenLimpio.substring(0, 10) + '...');
      
      // Probar acceso al repositorio
      const repoResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenLimpio}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );
      
      console.log('Status repositorio:', repoResponse.status);
      
      if (!repoResponse.ok) {
        const errorData = await repoResponse.json();
        console.error('❌ Error repositorio:', errorData);
        return false;
      }
      
      console.log('✓ Repositorio accesible');
      
      // Probar acceso al archivo
      const fileResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenLimpio}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );
      
      console.log('Status archivo:', fileResponse.status);
      
      if (fileResponse.status === 404) {
        console.log('ℹ️ Archivo no existe (esto es normal si es la primera vez)');
      } else if (!fileResponse.ok) {
        const errorData = await fileResponse.json();
        console.error('❌ Error archivo:', errorData);
        return false;
      } else {
        console.log('✓ Archivo accesible');
      }
      
      console.log('✅ Token funciona correctamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error en prueba:', error);
      return false;
    }
  },

  // Función para inicializar eventos
  inicializarEventos() {
    // Botón para mostrar/ocultar formulario
    document.getElementById('mostrarFormTransaccion').addEventListener('click', () => {
      this.toggleFormulario();
    });
    
    // Botón cancelar
    document.getElementById('cancelarTransaccion').addEventListener('click', () => {
      this.toggleFormulario();
    });
    
    // Formulario de envío
    document.getElementById('nuevaTransaccionForm').addEventListener('submit', (e) => {
      this.manejarEnvioFormulario(e);
    });
  },

  // Función de diagnóstico mejorada
async diagnosticarToken(githubToken) {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DEL TOKEN');
    
    const tokenLimpio = githubToken.trim();
    console.log('📝 Token (primeros 8 chars):', tokenLimpio.substring(0, 8) + '...');
    console.log('📝 Longitud del token:', tokenLimpio.length);
    
    // Verificar formato del token (debe empezar con github_pat_)
    if (!tokenLimpio.startsWith('github_pat_')) {
      console.error('❌ FORMATO INCORRECTO: Los Fine-Grained Tokens deben empezar con "github_pat_"');
      console.log('💡 El token proporcionado:', tokenLimpio.substring(0, 20) + '...');
      return false;
    }
    
    console.log('✅ Formato del token correcto');
    
    // Probar acceso al repositorio
    console.log('🔗 Probando acceso al repositorio...');
    const repoResponse = await fetch(
      `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenLimpio}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    console.log('📊 Status del repositorio:', repoResponse.status, repoResponse.statusText);
    
    if (repoResponse.status === 401) {
      const errorData = await repoResponse.json();
      console.error('❌ ERROR 401 - CREDENCIALES INCORRECTAS');
      console.error('Posibles causas:');
      console.error('1. Token expirado');
      console.error('2. Token revocado');
      console.error('3. Token sin permisos para este repositorio');
      console.error('4. Formato de token incorrecto');
      console.error('Detalles:', errorData);
      return false;
    }
    
    if (repoResponse.status === 403) {
      const errorData = await repoResponse.json();
      console.error('❌ ERROR 403 - PERMISOS INSUFICIENTES');
      console.error('El token no tiene permisos para acceder al repositorio');
      console.error('Detalles:', errorData);
      return false;
    }
    
    if (repoResponse.status === 404) {
      console.error('❌ ERROR 404 - REPOSITORIO NO ENCONTRADO');
      console.error('Verifica que el repositorio "suarezfco/nelly" exista');
      return false;
    }
    
    if (!repoResponse.ok) {
      const errorData = await repoResponse.json();
      console.error('❌ ERROR DESCONOCIDO:', repoResponse.status, errorData);
      return false;
    }
    
    const repoInfo = await repoResponse.json();
    console.log('✅ REPOSITORIO ACCESIBLE:', repoInfo.full_name);
    console.log('📁 Visibilidad:', repoInfo.visibility);
    console.log('🔒 Privado:', repoInfo.private);
    
    // Probar permisos de escritura
    console.log('✍️ Probando permisos de escritura...');
    const testFileResponse = await fetch(
      `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/TEST_README.md`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenLimpio}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    console.log('📊 Status archivo test:', testFileResponse.status);
    
    // Verificar archivo de transacciones
    console.log('📋 Verificando archivo de transacciones...');
    const transaccionesResponse = await fetch(
      `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenLimpio}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    console.log('📊 Status transacciones.json:', transaccionesResponse.status);
    
    if (transaccionesResponse.status === 200) {
      console.log('✅ transacciones.json existe y es accesible');
    } else if (transaccionesResponse.status === 404) {
      console.log('ℹ️ transacciones.json no existe (se creará automáticamente)');
    } else {
      console.log('📊 Estado inesperado:', transaccionesResponse.status);
    }
    
    console.log('🎉 DIAGNÓSTICO COMPLETADO - Token funciona correctamente');
    return true;
    
  } catch (error) {
    console.error('💥 ERROR EN DIAGNÓSTICO:', error);
    return false;
  }
},
  
  // Inicializar pestaña de transacciones
  inicializar() {
    this.inicializarEventos();
    this.cargarTransacciones();
    console.log('Pestaña "Transacciones" inicializada');
  }
};
