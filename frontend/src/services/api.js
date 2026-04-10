const API_BASE_URL = 'http://localhost:3000/api';

async function parseErrorBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const texto = await response.text();
  return texto ? { message: texto } : null;
}

function createApiError(response, errorData, fallbackMessage) {
  const message = errorData?.mensaje || errorData?.message || errorData?.error || fallbackMessage;
  const error = new Error(message);
  error.status = response.status;
  error.data = errorData;
  return error;
}

export async function compilarGramatica(codigoWison) {
  try {
    const response = await fetch(`${API_BASE_URL}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: codigoWison }),
    });

    if (!response.ok) {
      const errorData = await parseErrorBody(response);
      throw createApiError(response, errorData, 'Error al compilar la gramatica');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function analizarCadena(codigoWison, cadenaEntrada) {
  try {
    const response = await fetch(`${API_BASE_URL}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: codigoWison,
        input: cadenaEntrada,
      }),
    });

    if (!response.ok) {
      const errorData = await parseErrorBody(response);
      throw createApiError(response, errorData, 'Error al analizar la cadena');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
