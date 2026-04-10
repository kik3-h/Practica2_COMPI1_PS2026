<script>
  import * as d3 from 'd3';
  import { onDestroy, onMount } from 'svelte';
  import { analizarCadena } from '../services/api.js';

  const ejemploWison = `Wison ¿ Lex {: 
    Terminal $_Una_A <- 'a' ;
    Terminal $_Mas <- '+' ;
    Terminal $_FIN <- 'FIN';
:}

Syntax {{:
    No_Terminal %_S ;
    No_Terminal %_Prod_A ;
    
    Initial_Sim %_S ;
    
    %_S <= %_Prod_A $_FIN ;
    %_Prod_A <= $_Una_A $_Mas $_Una_A ;
:}}

?Wison`;

  let codigoWison = ejemploWison;
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

  async function probarEntrada() {
    const codigo = codigoWison.trim();
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
  <div class="panel-entrada">
    <h2>Pruebas de Gramaticas</h2>

    <label for="codigo-wison">Gramatica Wison Activa</label>
    <textarea
      id="codigo-wison"
      bind:value={codigoWison}
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

<style>
  .vista-gramaticas {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    min-height: 100%;
    overflow-y: auto;
    background-color: var(--darker-bg);
  }

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
    flex-grow: 1;
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
</style>
