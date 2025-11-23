// Ejecutar esto en la consola del navegador para migrar datos existentes
async function migrarDatosExistente() {
  const clave = prompt("Ingrese la nueva clave de acceso:");
  if (!clave) return;

  try {
    // Cargar datos básicos existentes
    const response = await fetch("json/datos-basicos.json");
    const datos = await response.json();

    // Encriptar y guardar
    const datosEncriptados = await seguridad.encriptar(datos, clave);

    console.log("Datos encriptados:", datosEncriptados);
    alert("Migración completada. Ahora use la nueva clave en el login.");
  } catch (error) {
    console.error("Error en migración:", error);
    alert("Error en migración: " + error.message);
  }
}
