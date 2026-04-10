const API_BASE_URL = 'http://localhost:3000/api';

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
      const errorData = await response.json();
      throw new Error(errorData.mensaje || 'Error al compilar la gramatica');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en compilarGramatica:', error);
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
      const errorData = await response.json();
      throw new Error(errorData.mensaje || 'Error al analizar la cadena');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en analizarCadena:', error);
    throw error;
  }
}
