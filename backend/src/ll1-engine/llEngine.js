/**
 * WisonCompiler_EH - Motor de Analisis LL(1)
 * 
 * Clase principal que implementa los algoritmos fundamentales para
 * el analisis sintactico descendente predictivo LL(1):
 * 
 * - Calculo de conjuntos PRIMERO (FIRST)
 * - Calculo de conjuntos SIGUIENTE (FOLLOW)
 * - Construccion de la tabla de analisis LL(1)
 * - Deteccion de conflictos/colisiones
 * 
 * Basado en la teoria de compiladores del Dragon Book (Aho, Sethi, Ullman)
 * 
 * @author Sistema de Compiladores - Organizacion de Lenguajes y Compiladores 1
 * @version 1.0.0
 */

// Constante para representar la cadena vacia (epsilon)
const EPSILON = 'EPSILON';
// Constante para representar el fin de cadena
const FIN_CADENA = '$';

class LLEngine {
  /**
   * Constructor del Motor LL(1)
   * 
   * @param {Object} ast - Arbol Sintactico Abstracto generado por Jison
   * @param {Array} ast.terminals - Lista de terminales declarados
   * @param {Array} ast.nonTerminals - Lista de no terminales declarados
   * @param {Array} ast.productions - Lista de producciones de la gramatica
   * @param {String} ast.initialSymbol - Simbolo inicial de la gramatica
   */
  constructor(ast) {
    this.ast = ast;
    
    // Extraer y normalizar los componentes de la gramatica
    this.terminales = this.extraerTerminales(ast);
    this.noTerminales = this.extraerNoTerminales(ast);
    this.producciones = this.normalizarProducciones(ast);
    this.simboloInicial = ast.initialSymbol;
    
    // Conjuntos PRIMERO y SIGUIENTE (se calculan bajo demanda)
    this.conjuntosPrimero = {};
    this.conjuntosSiguiente = {};
    
    // Tabla LL(1)
    this.tablaLL1 = {};
    
    // Lista de errores y advertencias
    this.errores = [];
    this.advertencias = [];
    
    // Log de inicializacion
    console.log('[LLEngine] Motor LL(1) inicializado');
    console.log('[LLEngine] Terminales encontrados:', this.terminales.length);
    console.log('[LLEngine] No terminales encontrados:', this.noTerminales.length);
    console.log('[LLEngine] Producciones encontradas:', this.producciones.length);
    console.log('[LLEngine] Simbolo inicial:', this.simboloInicial);
  }

  /**
   * Extraer nombres de terminales del AST
   * Los terminales en Wison inician con $_
   */
  extraerTerminales(ast) {
    const terminales = new Set();
    
    // Extraer de la declaracion de terminales en el bloque Lex
    if (ast.terminals && Array.isArray(ast.terminals)) {
      ast.terminals.forEach(terminal => {
        if (terminal.name) {
          terminales.add(terminal.name);
        }
      });
    }
    
    // Tambien extraer terminales usados en producciones (por si no estan declarados)
    if (ast.productions && Array.isArray(ast.productions)) {
      ast.productions.forEach(prod => {
        prod.rightSides.forEach(lado => {
          lado.symbols.forEach(simbolo => {
            if (simbolo.type === 'TerminalSymbol' && simbolo.name) {
              terminales.add(simbolo.name);
            }
          });
        });
      });
    }
    
    return Array.from(terminales);
  }

  /**
   * Extraer nombres de no terminales del AST
   * Los no terminales en Wison inician con %_
   */
  extraerNoTerminales(ast) {
    const noTerminales = new Set();
    
    // Extraer de la declaracion de no terminales
    if (ast.nonTerminals && Array.isArray(ast.nonTerminals)) {
      ast.nonTerminals.forEach(nt => {
        if (nt.name) {
          noTerminales.add(nt.name);
        }
      });
    }
    
    // Tambien incluir los que aparecen en el lado izquierdo de producciones
    if (ast.productions && Array.isArray(ast.productions)) {
      ast.productions.forEach(prod => {
        if (prod.leftSide) {
          noTerminales.add(prod.leftSide);
        }
      });
    }
    
    return Array.from(noTerminales);
  }

  /**
   * Normalizar las producciones a un formato mas manejable
   * 
   * Formato de salida:
   * [
   *   { ladoIzquierdo: '%_S', ladoDerecho: ['%_A', '$_b'], indice: 0 },
   *   { ladoIzquierdo: '%_S', ladoDerecho: ['EPSILON'], indice: 1 },
   *   ...
   * ]
   */
  normalizarProducciones(ast) {
    const producciones = [];
    let indice = 0;
    
    if (ast.productions && Array.isArray(ast.productions)) {
      ast.productions.forEach(prod => {
        const ladoIzquierdo = prod.leftSide;
        
        prod.rightSides.forEach(lado => {
          const ladoDerecho = [];
          
          if (lado.symbols && lado.symbols.length > 0) {
            lado.symbols.forEach(simbolo => {
              ladoDerecho.push(simbolo.name);
            });
          } else {
            // Produccion vacia (epsilon)
            ladoDerecho.push(EPSILON);
          }
          
          producciones.push({
            ladoIzquierdo: ladoIzquierdo,
            ladoDerecho: ladoDerecho,
            indice: indice,
            original: `${ladoIzquierdo} -> ${ladoDerecho.join(' ')}`
          });
          
          indice++;
        });
      });
    }
    
    return producciones;
  }

  /**
   * Verificar si un simbolo es terminal
   */
  esTerminal(simbolo) {
    if (!simbolo) return false;
    // Los terminales en Wison inician con $_
    return simbolo.startsWith('$_') || simbolo === FIN_CADENA;
  }

  /**
   * Verificar si un simbolo es no terminal
   */
  esNoTerminal(simbolo) {
    if (!simbolo) return false;
    // Los no terminales en Wison inician con %_
    return simbolo.startsWith('%_');
  }

  /**
   * Verificar si un simbolo es epsilon
   */
  esEpsilon(simbolo) {
    return simbolo === EPSILON;
  }

  // ============================================================================
  // CALCULO DE CONJUNTOS PRIMERO (FIRST)
  // ============================================================================
  
  /**
   * ALGORITMO CALCULO DE PRIMERO (FIRST)
   * 
   * Reglas matematicas aplicadas:
   * 
   * REGLA 1: Si X es terminal, entonces PRIMERO(X) = {X}
   * 
   * REGLA 2: Si X es no terminal y existe X -> EPSILON, entonces
   *          agregar EPSILON a PRIMERO(X)
   * 
   * REGLA 3: Si X es no terminal y existe X -> Y1 Y2 ... Yk, entonces:
   *          - Agregar PRIMERO(Y1) - {EPSILON} a PRIMERO(X)
   *          - Si EPSILON esta en PRIMERO(Y1), agregar PRIMERO(Y2) - {EPSILON}
   *          - Continuar hasta encontrar un Yi sin EPSILON en PRIMERO(Yi)
   *          - Si EPSILON esta en PRIMERO(Yi) para todo i=1..k, agregar EPSILON
   * 
   * Se utiliza un algoritmo de punto fijo que itera hasta que no haya cambios.
   * 
   * @returns {Object} Mapa de simbolo -> conjunto PRIMERO
   */
  calcularPrimeros() {
    console.log('[LLEngine] Iniciando calculo de conjuntos PRIMERO...');
    
    // Inicializar conjuntos vacios para todos los no terminales
    this.noTerminales.forEach(nt => {
      this.conjuntosPrimero[nt] = new Set();
    });
    
    // REGLA 1: Para terminales, PRIMERO(a) = {a}
    this.terminales.forEach(t => {
      this.conjuntosPrimero[t] = new Set([t]);
    });
    
    // Agregar EPSILON como su propio PRIMERO
    this.conjuntosPrimero[EPSILON] = new Set([EPSILON]);
    
    // Algoritmo de punto fijo: iterar hasta que no haya cambios
    let huboCambios = true;
    let iteraciones = 0;
    const maxIteraciones = 1000; // Prevenir ciclos infinitos
    
    while (huboCambios && iteraciones < maxIteraciones) {
      huboCambios = false;
      iteraciones++;
      
      // Procesar cada produccion
      this.producciones.forEach(produccion => {
        const A = produccion.ladoIzquierdo; // No terminal del lado izquierdo
        const beta = produccion.ladoDerecho; // Lado derecho de la produccion
        
        // Calcular PRIMERO del lado derecho
        const primeroBeta = this.calcularPrimeroDeCadena(beta);
        
        // Agregar PRIMERO(beta) a PRIMERO(A)
        const tamanoAnterior = this.conjuntosPrimero[A].size;
        primeroBeta.forEach(simbolo => {
          this.conjuntosPrimero[A].add(simbolo);
        });
        
        // Verificar si hubo cambios
        if (this.conjuntosPrimero[A].size > tamanoAnterior) {
          huboCambios = true;
        }
      });
    }
    
    console.log('[LLEngine] Calculo de PRIMERO completado en', iteraciones, 'iteraciones');
    
    // Convertir Sets a Arrays para la respuesta
    const resultado = {};
    Object.keys(this.conjuntosPrimero).forEach(simbolo => {
      if (this.esNoTerminal(simbolo)) {
        resultado[simbolo] = Array.from(this.conjuntosPrimero[simbolo]).sort();
      }
    });
    
    return resultado;
  }

  /**
   * Calcular PRIMERO de una cadena de simbolos (Y1 Y2 ... Yk)
   * 
   * Aplica la REGLA 3 del algoritmo PRIMERO:
   * - Agregar PRIMERO(Y1) - {EPSILON}
   * - Si EPSILON en PRIMERO(Y1), agregar PRIMERO(Y2) - {EPSILON}
   * - Si todos tienen EPSILON, agregar EPSILON al resultado
   * 
   * @param {Array} cadena - Arreglo de simbolos
   * @returns {Set} Conjunto PRIMERO de la cadena
   */
  calcularPrimeroDeCadena(cadena) {
    const resultado = new Set();
    
    if (!cadena || cadena.length === 0) {
      resultado.add(EPSILON);
      return resultado;
    }
    
    // Caso especial: la cadena es solo EPSILON
    if (cadena.length === 1 && this.esEpsilon(cadena[0])) {
      resultado.add(EPSILON);
      return resultado;
    }
    
    let todosDerivantEpsilon = true;
    
    for (let i = 0; i < cadena.length; i++) {
      const simbolo = cadena[i];
      
      // Si es EPSILON, continuar al siguiente
      if (this.esEpsilon(simbolo)) {
        continue;
      }
      
      // Obtener PRIMERO del simbolo actual
      const primeroSimbolo = this.conjuntosPrimero[simbolo] || new Set();
      
      // Agregar PRIMERO(simbolo) - {EPSILON} al resultado
      primeroSimbolo.forEach(s => {
        if (!this.esEpsilon(s)) {
          resultado.add(s);
        }
      });
      
      // Si EPSILON no esta en PRIMERO(simbolo), terminamos
      if (!primeroSimbolo.has(EPSILON)) {
        todosDerivantEpsilon = false;
        break;
      }
    }
    
    // Si todos los simbolos pueden derivar EPSILON, agregar EPSILON
    if (todosDerivantEpsilon) {
      resultado.add(EPSILON);
    }
    
    return resultado;
  }

  /**
   * Obtener PRIMERO de un simbolo individual (ya calculado)
   */
  obtenerPrimero(simbolo) {
    if (this.esTerminal(simbolo)) {
      return new Set([simbolo]);
    }
    if (this.esEpsilon(simbolo)) {
      return new Set([EPSILON]);
    }
    return this.conjuntosPrimero[simbolo] || new Set();
  }

  // ============================================================================
  // CALCULO DE CONJUNTOS SIGUIENTE (FOLLOW)
  // ============================================================================

  /**
   * ALGORITMO CALCULO DE SIGUIENTE (FOLLOW)
   * 
   * Reglas matematicas aplicadas:
   * 
   * REGLA 1: Agregar $ (fin de cadena) a SIGUIENTE del simbolo inicial S
   *          SIGUIENTE(S) = SIGUIENTE(S) U {$}
   * 
   * REGLA 2: Si existe una produccion A -> alfa B beta, entonces:
   *          SIGUIENTE(B) = SIGUIENTE(B) U (PRIMERO(beta) - {EPSILON})
   *          
   *          Es decir, todo lo que puede aparecer inmediatamente despues de B
   *          en alguna forma sentencial.
   * 
   * REGLA 3: Si existe A -> alfa B, o A -> alfa B beta donde EPSILON esta en
   *          PRIMERO(beta), entonces:
   *          SIGUIENTE(B) = SIGUIENTE(B) U SIGUIENTE(A)
   *          
   *          Es decir, si B esta al final o lo que sigue puede ser vacio,
   *          entonces lo que sigue a A tambien puede seguir a B.
   * 
   * Se utiliza un algoritmo de punto fijo que itera hasta que no haya cambios.
   * 
   * @returns {Object} Mapa de no terminal -> conjunto SIGUIENTE
   */
  calcularSiguientes() {
    console.log('[LLEngine] Iniciando calculo de conjuntos SIGUIENTE...');
    
    // Asegurarse de que PRIMERO ya fue calculado
    if (Object.keys(this.conjuntosPrimero).length === 0) {
      this.calcularPrimeros();
    }
    
    // Inicializar conjuntos SIGUIENTE vacios para todos los no terminales
    this.noTerminales.forEach(nt => {
      this.conjuntosSiguiente[nt] = new Set();
    });
    
    // REGLA 1: Agregar $ al SIGUIENTE del simbolo inicial
    if (this.simboloInicial) {
      this.conjuntosSiguiente[this.simboloInicial].add(FIN_CADENA);
    }
    
    // Algoritmo de punto fijo
    let huboCambios = true;
    let iteraciones = 0;
    const maxIteraciones = 1000;
    
    while (huboCambios && iteraciones < maxIteraciones) {
      huboCambios = false;
      iteraciones++;
      
      // Procesar cada produccion
      this.producciones.forEach(produccion => {
        const A = produccion.ladoIzquierdo;
        const beta = produccion.ladoDerecho;
        
        // Recorrer cada simbolo del lado derecho
        for (let i = 0; i < beta.length; i++) {
          const B = beta[i];
          
          // Solo procesar no terminales
          if (!this.esNoTerminal(B)) {
            continue;
          }
          
          // Obtener lo que sigue a B en la produccion (beta[i+1..n])
          const siguienteEnProduccion = beta.slice(i + 1);
          
          // REGLA 2: Agregar PRIMERO(siguienteEnProduccion) - {EPSILON} a SIGUIENTE(B)
          const primeroSiguiente = this.calcularPrimeroDeCadena(siguienteEnProduccion);
          const tamanoAnterior = this.conjuntosSiguiente[B].size;
          
          primeroSiguiente.forEach(s => {
            if (!this.esEpsilon(s)) {
              this.conjuntosSiguiente[B].add(s);
            }
          });
          
          // REGLA 3: Si siguienteEnProduccion es vacio o deriva EPSILON,
          // agregar SIGUIENTE(A) a SIGUIENTE(B)
          if (siguienteEnProduccion.length === 0 || primeroSiguiente.has(EPSILON)) {
            const siguienteA = this.conjuntosSiguiente[A] || new Set();
            siguienteA.forEach(s => {
              this.conjuntosSiguiente[B].add(s);
            });
          }
          
          // Verificar si hubo cambios
          if (this.conjuntosSiguiente[B].size > tamanoAnterior) {
            huboCambios = true;
          }
        }
      });
    }
    
    console.log('[LLEngine] Calculo de SIGUIENTE completado en', iteraciones, 'iteraciones');
    
    // Convertir Sets a Arrays para la respuesta
    const resultado = {};
    this.noTerminales.forEach(nt => {
      resultado[nt] = Array.from(this.conjuntosSiguiente[nt]).sort();
    });
    
    return resultado;
  }

  // ============================================================================
  // CONSTRUCCION DE TABLA LL(1)
  // ============================================================================

  /**
   * ALGORITMO CONSTRUCCION DE TABLA LL(1)
   * 
   * Para cada produccion A -> alfa de la gramatica:
   * 
   * REGLA 1: Para cada terminal 'a' en PRIMERO(alfa), agregar A -> alfa a M[A, a]
   * 
   * REGLA 2: Si EPSILON esta en PRIMERO(alfa), entonces para cada terminal 'b'
   *          en SIGUIENTE(A), agregar A -> alfa a M[A, b]
   * 
   * REGLA 3: Si EPSILON esta en PRIMERO(alfa) y $ esta en SIGUIENTE(A),
   *          agregar A -> alfa a M[A, $]
   * 
   * DETECCION DE CONFLICTOS:
   * Si al intentar agregar una produccion a M[A, a] ya existe otra produccion
   * diferente, entonces hay un conflicto LL(1). Esto indica que la gramatica:
   * - Es ambigua, o
   * - Tiene recursividad por la izquierda, o
   * - Necesita factorizacion por la izquierda
   * 
   * @returns {Object} Tabla LL(1) y estado de conflictos
   */
  construirTabla() {
    console.log('[LLEngine] Iniciando construccion de tabla LL(1)...');
    
    // Asegurarse de que PRIMERO y SIGUIENTE estan calculados
    if (Object.keys(this.conjuntosPrimero).length === 0) {
      this.calcularPrimeros();
    }
    if (Object.keys(this.conjuntosSiguiente).length === 0) {
      this.calcularSiguientes();
    }
    
    // Inicializar tabla vacia
    // Estructura: tabla[noTerminal][terminal] = produccion
    this.tablaLL1 = {};
    this.noTerminales.forEach(nt => {
      this.tablaLL1[nt] = {};
    });
    
    // Conjunto de terminales de la tabla (incluyendo $)
    const terminalesTabla = [...this.terminales, FIN_CADENA];
    
    // Lista de conflictos encontrados
    const conflictos = [];
    
    // Procesar cada produccion
    this.producciones.forEach(produccion => {
      const A = produccion.ladoIzquierdo;
      const alfa = produccion.ladoDerecho;
      
      // Calcular PRIMERO del lado derecho
      const primeroAlfa = this.calcularPrimeroDeCadena(alfa);
      
      // REGLA 1: Para cada terminal en PRIMERO(alfa), agregar a M[A, a]
      primeroAlfa.forEach(simbolo => {
        if (!this.esEpsilon(simbolo)) {
          const conflicto = this.agregarATabla(A, simbolo, produccion, conflictos);
          if (conflicto) {
            conflictos.push(conflicto);
          }
        }
      });
      
      // REGLA 2 y 3: Si EPSILON esta en PRIMERO(alfa)
      if (primeroAlfa.has(EPSILON)) {
        const siguienteA = this.conjuntosSiguiente[A] || new Set();
        
        // Para cada terminal en SIGUIENTE(A), agregar a M[A, b]
        siguienteA.forEach(b => {
          const conflicto = this.agregarATabla(A, b, produccion, conflictos);
          if (conflicto) {
            conflictos.push(conflicto);
          }
        });
      }
    });
    
    console.log('[LLEngine] Construccion de tabla completada');
    
    // Verificar si hay conflictos
    if (conflictos.length > 0) {
      console.log('[LLEngine] ADVERTENCIA: Se encontraron', conflictos.length, 'conflictos LL(1)');
      this.errores.push({
        tipo: 'Colision LL(1)',
        mensaje: 'La gramatica no es LL(1). Se encontraron conflictos en la tabla.',
        cantidad: conflictos.length,
        conflictos: conflictos
      });
    }
    
    // Formatear tabla para respuesta
    const tablaFormateada = this.formatearTabla(terminalesTabla);
    
    return {
      tabla: tablaFormateada,
      esLL1: conflictos.length === 0,
      conflictos: conflictos,
      terminalesColumnas: terminalesTabla,
      noTerminalesFilas: this.noTerminales
    };
  }

  /**
   * Agregar una produccion a la tabla LL(1) con deteccion de conflictos
   * 
   * @param {String} noTerminal - No terminal (fila)
   * @param {String} terminal - Terminal (columna)
   * @param {Object} produccion - Produccion a agregar
   * @param {Array} conflictos - Lista de conflictos existentes
   * @returns {Object|null} Conflicto si existe, null si no
   */
  agregarATabla(noTerminal, terminal, produccion, conflictos) {
    // Verificar que el no terminal existe en la tabla
    if (!this.tablaLL1[noTerminal]) {
      this.tablaLL1[noTerminal] = {};
    }
    
    // Verificar si ya existe una produccion en esta celda
    const existente = this.tablaLL1[noTerminal][terminal];
    
    if (existente) {
      // Verificar si es la misma produccion (no es conflicto)
      if (existente.indice === produccion.indice) {
        return null; // Misma produccion, no hay conflicto
      }
      
      // CONFLICTO DETECTADO
      const conflicto = {
        tipo: 'Colision LL(1)',
        mensaje: `Conflicto en M[${noTerminal}, ${terminal}]: La gramatica no es LL(1)`,
        noTerminal: noTerminal,
        terminal: terminal,
        produccionExistente: existente.original,
        produccionNueva: produccion.original,
        sugerencia: 'Verifique recursividad por la izquierda, ambiguedad o necesidad de factorizacion'
      };
      
      console.log('[LLEngine] CONFLICTO:', conflicto.mensaje);
      
      return conflicto;
    }
    
    // No hay conflicto, agregar produccion a la tabla
    this.tablaLL1[noTerminal][terminal] = produccion;
    return null;
  }

  /**
   * Formatear la tabla LL(1) para presentacion
   */
  formatearTabla(terminales) {
    const tablaFormateada = {};
    
    this.noTerminales.forEach(nt => {
      tablaFormateada[nt] = {};
      
      terminales.forEach(t => {
        const produccion = this.tablaLL1[nt][t];
        
        if (produccion) {
          tablaFormateada[nt][t] = {
            produccion: produccion.original,
            indice: produccion.indice,
            ladoDerecho: produccion.ladoDerecho
          };
        } else {
          tablaFormateada[nt][t] = null; // Celda vacia (error)
        }
      });
    });
    
    return tablaFormateada;
  }

  // ============================================================================
  // METODO PRINCIPAL DE ANALISIS
  // ============================================================================

  /**
   * Ejecutar analisis completo LL(1)
   * Calcula PRIMERO, SIGUIENTE y construye la tabla
   * 
   * @returns {Object} Resultado completo del analisis
   */
  analizarGramatica() {
    console.log('[LLEngine] Iniciando analisis completo de la gramatica...');
    const tiempoInicio = Date.now();
    
    try {
      // Validaciones previas
      this.validarGramatica();
      
      // Calcular conjuntos
      const primeros = this.calcularPrimeros();
      const siguientes = this.calcularSiguientes();
      
      // Construir tabla
      const resultadoTabla = this.construirTabla();
      
      const tiempoTotal = Date.now() - tiempoInicio;
      console.log('[LLEngine] Analisis completado en', tiempoTotal, 'ms');
      
      return {
        exito: resultadoTabla.esLL1,
        tiempoAnalisis: tiempoTotal,
        gramatica: {
          terminales: this.terminales,
          noTerminales: this.noTerminales,
          producciones: this.producciones.map(p => p.original),
          simboloInicial: this.simboloInicial,
          totalProducciones: this.producciones.length
        },
        conjuntos: {
          primero: primeros,
          siguiente: siguientes
        },
        tablaLL1: resultadoTabla,
        esGramaticaLL1: resultadoTabla.esLL1,
        errores: this.errores,
        advertencias: this.advertencias
      };
      
    } catch (error) {
      console.log('[LLEngine] Error durante el analisis:', error.message);
      
      return {
        exito: false,
        error: error.message,
        tiempoAnalisis: Date.now() - tiempoInicio,
        errores: [...this.errores, { tipo: 'Error', mensaje: error.message }],
        advertencias: this.advertencias
      };
    }
  }

  /**
   * Validar que la gramatica tiene los elementos necesarios
   */
  validarGramatica() {
    // Validar simbolo inicial
    if (!this.simboloInicial) {
      throw new Error('Error Semantico: No se ha definido el simbolo inicial de la gramatica');
    }
    
    // Validar que el simbolo inicial es un no terminal declarado
    if (!this.noTerminales.includes(this.simboloInicial)) {
      throw new Error(`Error Semantico: El simbolo inicial '${this.simboloInicial}' no esta declarado como no terminal`);
    }
    
    // Validar que hay al menos una produccion
    if (this.producciones.length === 0) {
      throw new Error('Error Semantico: La gramatica no tiene producciones definidas');
    }
    
    // Validar que todos los no terminales usados en producciones estan declarados
    this.producciones.forEach(prod => {
      prod.ladoDerecho.forEach(simbolo => {
        if (this.esNoTerminal(simbolo) && !this.noTerminales.includes(simbolo)) {
          this.advertencias.push({
            tipo: 'Advertencia',
            mensaje: `No terminal '${simbolo}' usado en produccion pero no declarado`
          });
        }
      });
    });
    
    // Validar que hay producciones para el simbolo inicial
    const produccionesInicial = this.producciones.filter(p => p.ladoIzquierdo === this.simboloInicial);
    if (produccionesInicial.length === 0) {
      throw new Error(`Error Semantico: No hay producciones para el simbolo inicial '${this.simboloInicial}'`);
    }
    
    console.log('[LLEngine] Validacion de gramatica completada');
  }

  /**
   * Obtener resumen del analisis para logging/debugging
   */
  obtenerResumen() {
    return {
      terminales: this.terminales,
      noTerminales: this.noTerminales,
      cantidadProducciones: this.producciones.length,
      simboloInicial: this.simboloInicial,
      primerCalculado: Object.keys(this.conjuntosPrimero).length > 0,
      siguienteCalculado: Object.keys(this.conjuntosSiguiente).length > 0,
      tablaCalculada: Object.keys(this.tablaLL1).length > 0
    };
  }
}

// Exportar la clase y constantes
module.exports = LLEngine;
module.exports.EPSILON = EPSILON;
module.exports.FIN_CADENA = FIN_CADENA;