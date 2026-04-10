<script>
  import { onMount, onDestroy } from 'svelte';
  import { compilarGramatica, analizarCadena } from '../services/api.js';

  let editor = null;
  let monaco = null;
  let consoleOutput = '';
  let isLoading = false;

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

  onMount(async () => {
    const monacoModule = await import('monaco-editor');
    monaco = monacoModule.default;

    const editorContainer = document.getElementById('editor-container');
    
    editor = monaco.editor.create(editorContainer, {
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

    window.addEventListener('resize', () => {
      if (editor) {
        editor.layout();
      }
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  async function handleCompile() {
    if (!editor) return;
    
    isLoading = true;
    consoleOutput = '';

    try {
      const codigo = editor.getValue();
      const resultado = await compilarGramatica(codigo);

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
        consoleOutput = 'COMPILACION EXITOSA\n';
        consoleOutput += 'Gramatica compilada correctamente.\n';
        if (resultado.tabla_ll1) {
          consoleOutput += '\nTabla LL(1) generada exitosamente.\n';
        }
        if (resultado.ast) {
          consoleOutput += 'AST generado exitosamente.\n';
        }
      }
    } catch (error) {
      consoleOutput = `ERROR DE RED: ${error.message}\n\nAsegurese de que el servidor backend esta en ejecucion en http://localhost:3000`;
    } finally {
      isLoading = false;
    }
  }

  function clearConsole() {
    consoleOutput = '';
  }
</script>

<div class="editor-section">
  <div class="editor-toolbar">
    <button 
      class="btn-primary" 
      on:click={handleCompile}
      disabled={isLoading}
    >
      {isLoading ? 'Compilando...' : 'Compilar Gramatica'}
    </button>
    <button 
      class="btn-secondary" 
      on:click={clearConsole}
    >
      Limpiar Consola
    </button>
  </div>

  <div id="editor-container" class="editor-container"></div>

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
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--dark-bg);
    border-radius: 4px;
    border: 1px solid var(--border-color);
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

  .console-output.empty {
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
