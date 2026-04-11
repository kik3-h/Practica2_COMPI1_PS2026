<script>
  import * as monaco from 'monaco-editor';
  import { onMount, onDestroy } from 'svelte';
  import { compilarGramatica } from '../services/api.js';
  import { codigoGramaticaActiva, tablaSimbolosActiva, guardarGramatica } from '../stores/grammarStore.js';

  let editorContainer = null;
  let editorInstance = null;
  let fileInput = null;
  let resizeHandler = null;
  let consoleOutput = '';
  let isLoading = false;
  let nombreGramatica = '';

  const exampleCode = `Wison ¿ Lex {: 
    Terminal $_Una_A <- 'a' ;
    Terminal $_Mas <- '+' ;
    Terminal $_Punto <- '.' ;
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

  onMount(() => {
    if (!editorContainer) {
      consoleOutput = 'No se encontro el contenedor del editor.';
      return;
    }

    editorInstance = monaco.editor.create(editorContainer, {
      value: exampleCode,
      language: 'plaintext',
      theme: 'vs-dark',
      fontSize: 13,
      fontFamily: "'Courier New', monospace",
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 },
    });

    resizeHandler = () => {
      if (editorInstance) {
        editorInstance.layout();
      }
    };

    window.addEventListener('resize', resizeHandler);
  });

  onDestroy(() => {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }

    if (editorInstance) {
      editorInstance.dispose();
      editorInstance = null;
    }
  });

  function extraerTablaSimbolos(ast) {
    if (!ast || typeof ast !== 'object') {
      return [];
    }

    const simbolos = [];
    const simbolosVistos = new Set();

    const agregarSimbolo = (simbolo, tipo) => {
      if (!simbolo) {
        return;
      }

      const simboloNormalizado = String(simbolo);
      const clave = `${tipo}:${simboloNormalizado}`;
      if (simbolosVistos.has(clave)) {
        return;
      }

      simbolos.push({ simbolo: simboloNormalizado, tipo });
      simbolosVistos.add(clave);
    };

    if (Array.isArray(ast.terminals)) {
      ast.terminals.forEach((terminal) => {
        agregarSimbolo(typeof terminal === 'string' ? terminal : terminal?.name, 'Terminal');
      });
    }

    if (Array.isArray(ast.nonTerminals)) {
      ast.nonTerminals.forEach((noTerminal) => {
        agregarSimbolo(typeof noTerminal === 'string' ? noTerminal : noTerminal?.name, 'No Terminal');
      });
    }

    return simbolos;
  }

  async function handleCompile() {
    if (!editorInstance) {
      consoleOutput = 'El editor no esta inicializado.';
      return;
    }

    const textoWison = editorInstance.getValue();
    if (!textoWison.trim()) {
      consoleOutput = 'El editor esta vacio. Ingresa codigo Wison antes de compilar.';
      return;
    }

    isLoading = true;
    consoleOutput = '';

    try {
      const resultado = await compilarGramatica(textoWison);

      if (resultado.errores && resultado.errores.length > 0) {
        let errorText = 'ERRORES ENCONTRADOS:\n\n';
        resultado.errores.forEach((error, index) => {
          errorText += `Error ${index + 1}:\n`;
          errorText += `  Linea ${error.linea || 'desconocida'}, Columna ${error.columna || 'desconocida'}\n`;
          errorText += `  Tipo: ${error.tipo || 'error'}\n`;
          errorText += `  Mensaje: ${error.mensaje}\n\n`;
        });
        consoleOutput = errorText;
      } else {
        $codigoGramaticaActiva = textoWison;
        consoleOutput = 'COMPILACION EXITOSA\n';
        consoleOutput += 'Gramatica compilada correctamente.\n';
        if (resultado.tabla_ll1) {
          consoleOutput += '\nTabla LL(1) generada exitosamente.\n';
        }
        if (resultado.ast) {
          $tablaSimbolosActiva = extraerTablaSimbolos(resultado.ast);
          guardarGramatica(
            nombreGramatica || 'Gramatica Sin Nombre',
            textoWison,
            $tablaSimbolosActiva
          );
          consoleOutput += 'AST generado exitosamente.\n';
        }
      }
    } catch (error) {
      consoleOutput = `ERROR DE RED: ${error.message}\n\nAsegurese de que el servidor backend esta en ejecucion en http://localhost:3000`;
    } finally {
      isLoading = false;
    }
  }

  function abrirSelectorArchivo() {
    if (!fileInput) {
      consoleOutput = 'No se pudo abrir el selector de archivos.';
      return;
    }

    fileInput.click();
  }

  function manejarCargaArchivo(event) {
    const archivo = event.target.files?.[0];

    if (!archivo) {
      return;
    }

    if (!editorInstance) {
      consoleOutput = 'El editor no esta inicializado.';
      event.target.value = '';
      return;
    }

    const lector = new FileReader();

    lector.onload = (loadEvent) => {
      const contenido = typeof loadEvent.target?.result === 'string' ? loadEvent.target.result : '';
      editorInstance.setValue(contenido);
      consoleOutput = `Archivo "${archivo.name}" cargado correctamente.`;
      event.target.value = '';
    };

    lector.onerror = () => {
      consoleOutput = `No se pudo leer el archivo "${archivo.name}".`;
      event.target.value = '';
    };

    lector.readAsText(archivo);
  }

  function clearConsole() {
    consoleOutput = '';
  }
</script>

<div class="editor-section">
  <div class="editor-toolbar">
    <button 
      class="btn-primary" 
      type="button"
      on:click={handleCompile}
      disabled={isLoading}
    >
      {isLoading ? 'Compilando...' : 'Compilar Gramatica'}
    </button>
    <input
      type="text"
      class="input-nombre-gramatica"
      placeholder="Nombre de la gramatica"
      bind:value={nombreGramatica}
      disabled={isLoading}
    />
    <button
      class="btn btn-load-file"
      type="button"
      on:click={abrirSelectorArchivo}
      disabled={isLoading}
    >
      Cargar Archivo .wison
    </button>
    <button 
      class="btn-secondary" 
      type="button"
      on:click={clearConsole}
    >
      Limpiar Consola
    </button>
    <input
      type="file"
      accept=".wison"
      style="display: none;"
      bind:this={fileInput}
      on:change={manejarCargaArchivo}
    />
  </div>

  <div class="editor-container" bind:this={editorContainer}></div>

  <div class="console-section">
    <div class="console-header">Consola de Salida</div>
    <div class="console-output scroll-bar">
      {#if consoleOutput === ''}
        <div class="empty">Aqui aparecera la salida del compilador...</div>
      {:else}
        {#each consoleOutput.split('\n') as line}
          {#if line.includes('ERROR') || line.includes('Error')}
            <div class="error-message">{line}</div>
          {:else if line.includes('EXITOSA') || line.includes('correctamente')}
            <div class="success-message">{line}</div>
          {:else}
            <div>{line}</div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .editor-section {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 12px;
    padding: 12px;
    background-color: var(--darker-bg);
  }

  .editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--dark-bg);
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }

  .input-nombre-gramatica {
    min-width: 240px;
    flex: 1 1 260px;
    max-width: 360px;
    background-color: #0f172a;
    color: var(--text-light);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 9px 10px;
    font-size: 13px;
  }

  .input-nombre-gramatica::placeholder {
    color: var(--text-muted);
  }

  .editor-container {
    flex: 1;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
  }

  .console-section {
    display: flex;
    flex-direction: column;
    height: 200px;
    gap: 8px;
  }

  .console-header {
    font-weight: 600;
    color: var(--primary-gold);
    padding: 0 8px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .console-output {
    background-color: var(--dark-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--text-muted);
    flex: 1;
  }

  .btn-load-file {
    background-color: var(--primary-gold);
    color: #1e293b;
    border: 1px solid #d4a400;
  }

  .btn-load-file:hover:not(:disabled) {
    background-color: #d4a400;
    color: #0f172a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 164, 0, 0.35);
  }

  .empty {
    color: var(--text-muted);
    font-style: italic;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-message {
    color: #ef4444;
    line-height: 1.4;
  }

  .success-message {
    color: #10b981;
    line-height: 1.4;
  }
</style>
