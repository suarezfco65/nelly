// api/proxy.js
export default async function handler(request) {
  const { method, headers, body } = request;

  // Solo permitir POST para seguridad
  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Se incluye 'filePath' en la desestructuración para que el cliente lo envíe
    const { githubToken, action, data, filePath } = await request.json();

    if (!githubToken) {
      return new Response(JSON.stringify({ error: "Token requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let response;

    // **VALIDACIÓN AÑADIDA:** Asegurar que filePath esté presente para las acciones de archivo
    if ((action === "getFile" || action === "updateFile") && !filePath) {
      return new Response(
        JSON.stringify({
          error: "Ruta de archivo (filePath) requerida para esta acción",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    switch (action) {
      case "getFile":
        // Se usa la variable filePath para generalizar el endpoint
        response = await fetch(
          `https://api.github.com/repos/suarezfco/nelly/contents/${filePath}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "Nelly-App",
            },
          }
        );
        break;
     case "listDir":
        // filePath será 'docs'. Se usa el parámetro 'data' para pasar el branch
        const branch = data?.branch || 'main';
        response = await fetch(
          `${GITHUB_API_BASE}/contents/${filePath}?ref=${branch}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "Nelly-App",
            },
          }
        );
        break;
      case "updateFile":
        // Se usa la variable filePath para generalizar el endpoint
        response = await fetch(
          `https://api.github.com/repos/suarezfco/nelly/contents/${filePath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "Nelly-App",
            },
            body: JSON.stringify(data),
          }
        );
        break;

      case "testRepo":
        response = await fetch(`https://api.github.com/repos/suarezfco/nelly`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Nelly-App",
          },
        });
        break;

      default:
        return new Response(JSON.stringify({ error: "Acción no válida" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        status: response.status,
        data: result,
        ok: response.ok,
      }),
      {
        status: response.ok ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
