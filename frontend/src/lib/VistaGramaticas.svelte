<script>
  import * as d3 from 'd3';
  import { onDestroy, onMount } from 'svelte';
  import { analizarCadena } from '../services/api.js';
  import {
    codigoGramaticaActiva,
    tablaSimbolosActiva,
    gramaticasGuardadas,
    limpiarHistorial
  } from '../stores/grammarStore.js';

  let cadenaEntrada = '';
  let svgContainer = null;
  let arbolActual = null;
  let isLoading = false;

  let estadoTipo = 'info';
  let estadoTitulo = 'Listo para evaluar';
  let estadoMensaje = 'Ingresa una gramatica y una cadena para analizar.';
  let detallesError = [];

  function limpiarArbol() {
    if (!svgContainer) {
      return;
    }

    d3.select(svgContainer).selectAll('*').remove();
  }

  function normalizarArbol(nodo) {
    if (!nodo || typeof nodo !== 'object') {
      return null;
    }

    const symbol = nodo.symbol ?? nodo.simbolo ?? '';
    const rawChildren = Array.isArray(nodo.children)
      ? nodo.children
      : Array.isArray(nodo.hijos)
        ? nodo.hijos
        : [];

    return {
      symbol: String(symbol),
      children: rawChildren.map(normalizarArbol).filter(Boolean),
    };
  }

  function dibujarArbol(arbolData) {
    limpiarArbol();

    if (!svgContainer || !arbolData) {
      return;
    }

    const arbolNormalizado = normalizarArbol(arbolData);
    if (!arbolNormalizado) {
      return;
    }

    const anchoContenedor = Math.max(320, svgContainer.clientWidth || 900);
    const altoContenedor = Math.max(500, svgContainer.clientHeight || 500);

    const jerarquia = d3.hierarchy(arbolNormalizado, (d) => d.children);
    const totalHojas = Math.max(1, jerarquia.leaves().length);
    const profundidad = Math.max(1, jerarquia.height + 1);

    const margenes = { top: 50, right: 60, bottom: 50, left: 60 };
    const anchoLayout = Math.max(anchoContenedor - margenes.left - margenes.right, totalHojas * 170);
    const altoLayout = Math.max(altoContenedor - margenes.top - margenes.bottom, profundidad * 150);

    const treeLayout = d3.tree().size([anchoLayout, altoLayout]);

    treeLayout(jerarquia);

    const svg = d3
      .select(svgContainer)
      .append('svg')
      .attr('width', anchoContenedor)
      .attr('height', altoContenedor)
      .attr('viewBox', `0 0 ${anchoContenedor} ${altoContenedor}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const grupoPrincipal = svg
      .append('g')
      .attr('transform', d3.zoomIdentity.translate(margenes.left, margenes.top));

    const linkVertical = d3
      .linkVertical()
      .x((d) => d.x)
      .y((d) => d.y);

    grupoPrincipal
      .selectAll('path.tree-link')
      .data(jerarquia.links())
      .join('path')
      .attr('class', 'tree-link')
      .attr('fill', 'none')
      .attr('stroke', '#EDBB00')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 1.5)
      .attr('d', linkVertical);

    const nodos = grupoPrincipal
      .selectAll('g.tree-node')
      .data(jerarquia.descendants())
      .join('g')
      .attr('class', 'tree-node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    nodos
      .append('circle')
      .attr('r', 24)
      .attr('fill', '#004D98')
      .attr('stroke', '#E2E8F0')
      .attr('stroke-width', 1.5);

    nodos
      .append('text')
      .text((d) => d.data.symbol)
      .attr('fill', '#FFFFFF')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle');

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (evento) => {
        grupoPrincipal.attr('transform', evento.transform);
      });

    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(margenes.left, margenes.top));
  }

  function actualizarEstado(tipo, titulo, mensaje, detalles = []) {
    estadoTipo = tipo;
    estadoTitulo = titulo;
    estadoMensaje = mensaje;
    detallesError = detalles;
  }

  function aplicarGramatica(gramatica) {
    $codigoGramaticaActiva = gramatica?.codigo || '';
    $tablaSimbolosActiva = Array.isArray(gramatica?.tabla) ? gramatica.tabla : [];
    arbolActual = null;
    limpiarArbol();

    actualizarEstado(
      'info',
      'Gramatica aplicada',
      `Se aplico "${gramatica?.nombre || 'Gramatica seleccionada'}" en el editor de pruebas.`
    );
  }

  async function probarEntrada() {
    const codigo = $codigoGramaticaActiva.trim();
    const entrada = cadenaEntrada;

    if (!codigo) {
      actualizarEstado(
        'error',
        'Gramatica requerida',
        'Debes ingresar una gramatica Wison antes de probar la entrada.'
      );
      arbolActual = null;
      limpiarArbol();
      return;
    }

    isLoading = true;
    actualizarEstado('info', 'Procesando', 'Analizando la cadena de entrada...');
    arbolActual = null;
    limpiarArbol();

    try {
      const resultado = await analizarCadena(codigo, entrada);

      if (resultado.aceptada) {
        actualizarEstado(
          'success',
          'Cadena Aceptada',
          resultado.mensaje || 'La cadena de entrada fue aceptada por la gramatica.'
        );

        if (resultado.tree) {
          arbolActual = normalizarArbol(resultado.tree);
          dibujarArbol(arbolActual);
        } else if (resultado.arbolDerivacion) {
          arbolActual = normalizarArbol(resultado.arbolDerivacion);
          dibujarArbol(arbolActual);
        } else {
          actualizarEstado(
            'error',
            'Error de visualizacion',
            'La API no devolvio un arbol de derivacion para mostrar.'
          );
        }
      } else {
        const mensajeError = resultado?.mensaje || 'La cadena de entrada no fue aceptada.';
        const detalle = resultado?.error?.mensaje ? [resultado.error.mensaje] : [];
        actualizarEstado('error', 'Cadena Rechazada', mensajeError, detalle);
      }
    } catch (error) {
      const mensaje = error?.message || 'No se pudo analizar la cadena de entrada.';
      const detalle = error?.data?.error?.mensaje ? [error.data.error.mensaje] : [];
      actualizarEstado('error', 'Error', mensaje, detalle);
      return;
    } finally {
      isLoading = false;
    }
  }

  const manejarResize = () => {
    if (arbolActual) {
      dibujarArbol(arbolActual);
    }
  };

  onMount(() => {
    window.addEventListener('resize', manejarResize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', manejarResize);
    limpiarArbol();
  });
</script>

<div class="vista-gramaticas">
  <aside class="panel-lista">
    <h2>Gramaticas Generadas</h2>
    <div class="lista-gramaticas scroll-bar">
      {#if $gramaticasGuardadas.length === 0}
        <div class="lista-vacia">No hay gramaticas guardadas todavia.</div>
      {:else}
        {#each $gramaticasGuardadas as gramatica, indice}
          <div class="gramatica-item">
            <div class="gramatica-nombre">{gramatica.nombre || `Gramatica ${indice + 1}`}</div>
            <button class="btn-aplicar" type="button" on:click={() => aplicarGramatica(gramatica)}>
              Aplicar
            </button>
          </div>
        {/each}
      {/if}
    </div>
    <button
      class="btn btn-outline-danger btn-limpiar-historial"
      type="button"
      on:click={limpiarHistorial}
    >
      Limpiar Historial
    </button>
  </aside>

  <div class="panel-contenido">
    <div class="panel-entrada">
      <h2>Pruebas de Gramaticas</h2>

      <label for="codigo-wison">Gramatica Wison Activa</label>
      <textarea
        id="codigo-wison"
        bind:value={$codigoGramaticaActiva}
        class="input-area"
        rows="10"
        placeholder="Pega aqui la gramatica Wison activa"
      ></textarea>

      <label for="cadena-entrada">Cadena de Entrada a evaluar</label>
      <textarea
        id="cadena-entrada"
        bind:value={cadenaEntrada}
        class="input-area"
        rows="4"
        placeholder="Ingresa la cadena a evaluar"
      ></textarea>

      <div class="tabla-simbolos-section">
        <h3>Tabla de Simbolos</h3>
        <div class="table-responsive tabla-simbolos-wrapper">
          <table class="table table-dark table-striped table-sm mb-0">
            <thead>
              <tr>
                <th>Simbolo</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {#if $tablaSimbolosActiva.length === 0}
                <tr>
                  <td colspan="2" class="sin-simbolos">No hay simbolos cargados.</td>
                </tr>
              {:else}
                {#each $tablaSimbolosActiva as fila}
                  <tr>
                    <td>{fila.simbolo}</td>
                    <td>{fila.tipo}</td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <button class="btn-probar-entrada" type="button" on:click={probarEntrada} disabled={isLoading}>
        {isLoading ? 'Analizando...' : 'Probar Entrada'}
      </button>

      <div class="status-panel status-{estadoTipo}">
        <div class="status-title">{estadoTitulo}</div>
        <div class="status-message">{estadoMensaje}</div>
        {#if detallesError.length > 0}
          <ul class="status-errors">
            {#each detallesError as detalle}
              <li>{detalle}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

    <div class="panel-arbol">
      <h3>Arbol de Derivacion</h3>
      <div bind:this={svgContainer} class="d3-tree-container"></div>
    </div>
  </div>
</div>

<style>
  .vista-gramaticas {
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-rows: auto 1fr;
    gap: 20px;
    padding: 16px;
    height: 100%;
    min-height: 0;
    background-color: var(--darker-bg);
  }

  .panel-lista,
  .panel-entrada,
  .panel-arbol {
    background-color: var(--dark-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 16px;
  }

  .panel-entrada {
    display: flex;
    flex-direction: column;
    gap: 10px;
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }

  .panel-lista {
    display: flex;
    flex-direction: column;
    gap: 12px;
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    max-height: 600px;
    overflow-y: auto;
  }

  .panel-contenido {
    display: contents;
  }

  .lista-gramaticas {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
  }

  .lista-vacia {
    padding: 12px;
    border: 1px dashed var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 13px;
    background-color: rgba(15, 23, 42, 0.5);
  }

  .gramatica-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: rgba(15, 23, 42, 0.7);
  }

  .gramatica-nombre {
    color: var(--text-light);
    font-size: 13px;
    font-weight: 600;
    word-break: break-word;
  }

  .btn-aplicar {
    background-color: #004d98;
    border: 1px solid #003a73;
    color: #ffffff;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-aplicar:hover {
    background-color: #003a73;
    box-shadow: 0 4px 10px rgba(0, 77, 152, 0.35);
  }

  .btn-limpiar-historial {
    margin-top: 14px;
    border-color: #a50044;
    color: #a50044;
    font-weight: 600;
  }

  .btn-limpiar-historial:hover {
    background-color: #a50044;
    border-color: #8a0036;
    color: #ffffff;
  }

  h2,
  h3 {
    color: var(--primary-gold);
    margin: 0;
  }

  label {
    color: var(--text-light);
    font-weight: 600;
    font-size: 13px;
  }

  .input-area {
    width: 100%;
    resize: vertical;
    min-height: 80px;
    background-color: #0f172a;
    color: var(--text-light);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 10px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .tabla-simbolos-section {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tabla-simbolos-wrapper {
    border: 1px solid var(--border-color);
    border-radius: 4px;
    max-height: 250px;
    overflow-y: auto;
  }

  .tabla-simbolos-wrapper :global(.table) {
    margin-bottom: 0;
  }

  .sin-simbolos {
    text-align: center;
    color: var(--text-muted);
  }

  .btn-probar-entrada {
    align-self: flex-start;
    background-color: var(--primary-granate);
    color: #ffffff;
    border: 1px solid #8a0036;
    border-radius: 4px;
    padding: 9px 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-probar-entrada:hover:not(:disabled) {
    background-color: #8a0036;
    box-shadow: 0 4px 10px rgba(165, 0, 68, 0.35);
    transform: translateY(-1px);
  }

  .btn-probar-entrada:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .status-panel {
    border-left: 4px solid var(--border-color);
    background-color: rgba(15, 23, 42, 0.65);
    border-radius: 4px;
    padding: 10px 12px;
  }

  .status-info {
    border-left-color: var(--primary-gold);
  }

  .status-success {
    border-left-color: #10b981;
  }

  .status-error {
    border-left-color: #ef4444;
  }

  .status-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--text-light);
  }

  .status-message {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .status-success .status-message {
    color: #6ee7b7;
  }

  .status-error .status-message {
    color: #fca5a5;
  }

  .status-errors {
    margin: 8px 0 0 0;
    padding-left: 18px;
    color: #fca5a5;
    font-size: 13px;
  }

  .panel-arbol {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1 1 auto;
    grid-column: 1 / 3;
    grid-row: 2 / 3;
    min-height: 500px;
    overflow: hidden;
  }

  .d3-tree-container {
    flex-grow: 1;
    min-height: 500px;
    overflow: hidden;
    background-color: #0b1220;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 8px;
  }

  .d3-tree-container :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
    touch-action: none;
  }

  @media (max-width: 1200px) {
    .vista-gramaticas {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      height: auto;
      overflow-y: auto;
    }

    .panel-lista,
    .panel-entrada,
    .panel-arbol {
      grid-column: 1 / 2;
      grid-row: auto;
    }

    .panel-lista {
      max-height: 280px;
    }
  }
</style>
