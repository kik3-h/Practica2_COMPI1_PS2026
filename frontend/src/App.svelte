<script>
  import EditorWison from './lib/EditorWison.svelte';
  
  let activeTab = 'inicio';

  function switchTab(tab) {
    activeTab = tab;
  }
</script>

<div class="container">
  <nav class="navbar">
    <div class="navbar-title">WisonCompiler_EH</div>
    <div class="nav-tabs">
      <button
        class="nav-tab {activeTab === 'inicio' ? 'active' : ''}"
        on:click={() => switchTab('inicio')}
      >
        Inicio
      </button>
      <button
        class="nav-tab {activeTab === 'editor' ? 'active' : ''}"
        on:click={() => switchTab('editor')}
      >
        Editor
      </button>
      <button
        class="nav-tab {activeTab === 'gramaticas' ? 'active' : ''}"
        on:click={() => switchTab('gramaticas')}
      >
        Gramaticas
      </button>
    </div>
  </nav>

  <div class="content-area">
    <div class="tab-content {activeTab === 'inicio' ? 'active' : ''}">
      <div class="inicio-content">
        <h1>Bienvenido a WisonCompiler_EH</h1>
        <p>Compilador para el lenguaje Wison basado en analisis sintactico LL(1)</p>
        
        <div class="info-section">
          <h2>Acerca de WisonCompiler</h2>
          <p>WisonCompiler_EH es una herramienta educativa para la compilacion y analisis del lenguaje Wison, 
          desarrollado como parte de la practica de Organizacion de Lenguajes y Compiladores.</p>
          
          <h3>Caracteristicas principales:</h3>
          <ul>
            <li>Compilacion de gramaticas Wison con validacion sintactica y semantica</li>
            <li>Generacion de tabla de analisis LL(1) con calculo de PRIMERO y SIGUIENTE</li>
            <li>Analizador sintactico predictivo descendente</li>
            <li>Generacion de arboles de derivacion para cadenas aceptadas</li>
            <li>Interfaz intuitiva con editor de codigo y consola de salida</li>
          </ul>

          <h3>Como usar:</h3>
          <ol>
            <li>Ve a la pestaña "Editor" para escribir tu gramatica Wison</li>
            <li>Haz clic en "Compilar Gramatica" para validar y compilar tu codigo</li>
            <li>Revisa la consola de salida para ver mensajes de exito o errores</li>
            <li>Una vez compilada, podras usar la gramatica en la seccion de Gramaticas</li>
          </ol>
        </div>
      </div>
    </div>

    <div class="tab-content {activeTab === 'editor' ? 'active' : ''}">
      <EditorWison />
    </div>

    <div class="tab-content {activeTab === 'gramaticas' ? 'active' : ''}">
      <div class="gramaticas-content">
        <h2>Gramaticas Disponibles</h2>
        <p>Esta seccion mostrara las gramaticas compiladas y permitira probar cadenas de entrada.</p>
        <p>En construccion...</p>
      </div>
    </div>
  </div>
</div>

<style>
  .inicio-content {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
  }

  .inicio-content h1 {
    font-size: 32px;
    margin-bottom: 12px;
    color: var(--primary-gold);
  }

  .inicio-content > p {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .info-section {
    background-color: var(--dark-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .info-section h2 {
    font-size: 20px;
    margin-bottom: 12px;
    color: var(--primary-gold);
  }

  .info-section h3 {
    font-size: 16px;
    margin-top: 16px;
    margin-bottom: 8px;
    color: var(--text-light);
  }

  .info-section p {
    line-height: 1.6;
    margin-bottom: 12px;
    color: var(--text-muted);
  }

  .info-section ul, .info-section ol {
    margin-left: 20px;
    margin-bottom: 12px;
  }

  .info-section li {
    margin-bottom: 6px;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .gramaticas-content {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
  }

  .gramaticas-content h2 {
    font-size: 24px;
    margin-bottom: 16px;
    color: var(--primary-gold);
  }

  .gramaticas-content p {
    color: var(--text-muted);
    margin-bottom: 12px;
  }
</style>

