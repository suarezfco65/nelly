// api/proxy.js
export default async function handler(request) {
  const { method, headers, body } = request;
  
  // Solo permitir POST para seguridad
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { githubToken, action, data } = await request.json();
    
    if (!githubToken) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let response;
    
    switch (action) {
      case 'getFile':
        response = await fetch(
          `https://api.github.com/repos/suarezfco/nelly/contents/json/transacciones.json`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'Nelly-App'
            }
          }
        );
        break;
        
      case 'updateFile':
        response = await fetch(
          `https://api.github.com/repos/suarezfco/nelly/contents/json/transacciones.json`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'Nelly-App'
            },
            body: JSON.stringify(data)
          }
        );
        break;
        
      case 'testRepo':
        response = await fetch(
          `https://api.github.com/repos/suarezfco/nelly`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'Nelly-App'
            }
          }
        );
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Acción no válida' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    const result = await response.json();
    
    return new Response(JSON.stringify({
      status: response.status,
      data: result,
      ok: response.ok
    }), {
      status: response.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
