import { writable } from 'svelte/store';

export const codigoGramaticaActiva = writable('');
export const tablaSimbolosActiva = writable([]);

function obtenerGramaticasIniciales() {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const gramaticasSerializadas = localStorage.getItem('wison_grammars');
  if (!gramaticasSerializadas) {
    return [];
  }

  try {
    const gramaticas = JSON.parse(gramaticasSerializadas);
    return Array.isArray(gramaticas) ? gramaticas : [];
  } catch (error) {
    console.error('No se pudieron cargar las gramaticas guardadas:', error);
    return [];
  }
}

function sincronizarGramaticas(gramaticas) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('wison_grammars', JSON.stringify(gramaticas));
  } catch (error) {
    console.error('No se pudieron guardar las gramaticas en localStorage:', error);
  }
}

export const gramaticasGuardadas = writable(obtenerGramaticasIniciales());

export function guardarGramatica(nombre, codigo, tabla) {
  gramaticasGuardadas.update((actuales) => {
    const actualizadas = [
      ...actuales,
      {
        nombre,
        codigo,
        tabla: Array.isArray(tabla) ? tabla : [],
      },
    ];

    sincronizarGramaticas(actualizadas);
    return actualizadas;
  });
}
