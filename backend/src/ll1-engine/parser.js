/**
 * WisonCompiler_EH - Parser LL(1) Predictivo Descendente
 * 
 * Implementacion del analizador sintactico predictivo descendente
 * basado en tabla LL(1) y algoritmo de pila.
 * 
 * ALGORITMO DE PARSING LL(1):
 * =============================================================================
 * 
 * Entrada: Cadena de tokens w y tabla de analisis M para gramatica G
 * Salida: Si w esta en L(G), produce derivacion izquierda; sino, error
 * 
 * Metodo:
 * 1. Inicializar pila con $ (fin) y simbolo inicial S
 *    Pila: [$ S]  (S en el tope)
 * 
 * 2. Sea 'a' el primer simbolo de w
 *    Sea X el simbolo en el tope de la pila
 * 
 * 3. WHILE (X != $) DO:
 *    
 *    CASO 1: X == a (match de terminal)
 *      - Hacer pop() de la pila
 *      - Avanzar al siguiente token de entrada (a = siguiente)
 *    
 *    CASO 2: X es terminal pero X != a
 *      - ERROR: Se esperaba X pero se encontro a
 *    
 *    CASO 3: M[X, a] es una produccion X -> Y1 Y2 ... Yk
 *      - Hacer pop() de la pila (eliminar X)
 *      - Hacer push(Yk ... Y2 Y1) en orden INVERSO
 *        (para que Y1 quede en el tope)
 *      - Emitir la produccion usada
 *    
 *    CASO 4: M[X, a] esta vacia
 *      - ERROR: No hay produccion valida para (X, a)
 *    
 *    X = tope de la pila
 * 
 * 4. Si X == $ y a == $, la cadena es ACEPTADA
 * 
 * =============================================================================
 * 
 * CONSTRUCCION DEL ARBOL DE DERIVACION:
 * 
 * Mientras se ejecuta el algoritmo, mantenemos una referencia al nodo actual
 * del arbol. Cuando expandimos una produccion, creamos nodos hijos.
 * 
 * @author Sistema de Compiladores - Organizacion de Lenguajes y Compiladores 1
 * @version 1.0.0
 */

// Constantes
const EPSILON = 'EPSILON';
const FIN_CADENA = '$';

class ParserLL1 {
  /**
   * Constructor del Parser LL(1)
   * 
   * @param {Object} tablaLL1 - Tabla de analisis LL(1)
   *        Formato: { '%_S': { '$_a': { produccion: '...', ladoDerecho: [...] } } }
   * @param {String} simboloInicial - Simbolo inicial de la gramatica
   * @param {Array} terminales - Lista de simbolos terminales
   * @param {Array} noTerminales - Lista de simbolos no terminales
   * @param {Object} opciones - Opciones de configuracion
   */
  constructor(tablaLL1, simboloInicial, terminales, noTerminales, opciones = {}) {
    this.tabla = tablaLL1;
    this.simboloInicial = simboloInicial;
    this.terminales = new Set(terminales);
    this.noTerminales = new Set(noTerminales);
    this.opciones = {
      debug: opciones.debug || false,
      maxPasos: opciones.maxPasos || 10000 // Limite de pasos para evitar loops
    };
    
    console.log('[ParserLL1] Inicializado con simbolo inicial:', simboloInicial);
    console.log('[ParserLL1] Terminales:', terminales.length, '| No terminales:', noTerminales.length);
  }

  /**
   * Verificar si un simbolo es terminal
   */
  esTerminal(simbolo) {
    if (!simbolo) return false;
    return simbolo.startsWith('$_') || simbolo === FIN_CADENA;
  }

  /**
   * Verificar si un simbolo es no terminal
   */
  esNoTerminal(simbolo) {
    if (!simbolo) return false;
    return simbolo.startsWith('%_');
  }

  /**
   * Verificar si un simbolo es epsilon
   */
  esEpsilon(simbolo) {
    return simbolo === EPSILON;
  }

  /**
   * Analizar una secuencia de tokens usando el algoritmo LL(1)
   * 
   * @param {Array} tokens - Arreglo de tokens del lexer
   *        Formato: [{ tipo: '$_NUM', valor: '123', ... }, ...]
   * @returns {Object} Resultado del analisis
   */
  analizar(tokens) {
    console.log('[ParserLL1] Iniciando analisis de', tokens.length, 'tokens');
    
    // Validar entrada
    if (!tokens || tokens.length === 0) {
      return {
        aceptada: false,
        error: {
          tipo: 'Error de Entrada',
          mensaje: 'No se proporcionaron tokens para analizar'
        }
      };
    }
    
    // Inicializar estructuras
    const pila = [FIN_CADENA, this.simboloInicial]; // $ en el fondo, S en el tope
    let indiceSimbolo = 0; // Indice del token actual
    let pasos = 0;
    const historialPasos = [];
    
    // Raiz del arbol de derivacion
    const arbolRaiz = {
      simbolo: this.simboloInicial,
      esTerminal: false,
      hijos: [],
      produccionUsada: null
    };
    
    // Pila paralela para construccion del arbol
    // Cada elemento tiene referencia al nodo en el arbol
    const pilaArbol = [null, arbolRaiz]; // null para $, nodo raiz para S
    
    if (this.opciones.debug) {
      console.log('[ParserLL1] Pila inicial:', pila);
      console.log('[ParserLL1] Tokens:', tokens.map(t => t.tipo));
    }
    
    // ALGORITMO PRINCIPAL
    while (pila.length > 0 && pasos < this.opciones.maxPasos) {
      pasos++;
      
      // Obtener tope de la pila
      const X = pila[pila.length - 1];
      const nodoActual = pilaArbol[pilaArbol.length - 1];
      
      // Obtener token actual
      const tokenActual = tokens[indiceSimbolo];
      const a = tokenActual ? tokenActual.tipo : FIN_CADENA;
      
      // Registrar paso
      const pasoInfo = {
        paso: pasos,
        pila: [...pila],
        entrada: tokens.slice(indiceSimbolo).map(t => t.tipo).join(' '),
        accion: ''
      };
      
      if (this.opciones.debug) {
        console.log('[ParserLL1] Paso', pasos, '| Pila:', pila.join(' '), '| Entrada:', a);
      }
      
      // CASO: Tope es $
      if (X === FIN_CADENA) {
        if (a === FIN_CADENA) {
          // ACEPTAR: Pila y entrada vacias (solo $)
          pasoInfo.accion = 'ACEPTAR - Cadena reconocida exitosamente';
          historialPasos.push(pasoInfo);
          
          console.log('[ParserLL1] Cadena ACEPTADA en', pasos, 'pasos');
          
          return {
            aceptada: true,
            mensaje: 'La cadena de entrada es valida segun la gramatica',
            pasos: pasos,
            historial: historialPasos,
            arbol: this.limpiarArbol(arbolRaiz)
          };
        } else {
          // ERROR: Entrada no consumida
          pasoInfo.accion = 'ERROR - Entrada restante sin consumir';
          historialPasos.push(pasoInfo);
          
          return {
            aceptada: false,
            error: {
              tipo: 'Error Sintactico',
              mensaje: 'Se esperaba fin de entrada pero se encontro: ' + a,
              tokenEncontrado: tokenActual,
              posicion: tokenActual ? tokenActual.posicion : -1,
              linea: tokenActual ? tokenActual.linea : -1,
              columna: tokenActual ? tokenActual.columna : -1
            },
            pasos: pasos,
            historial: historialPasos
          };
        }
      }
      
      // CASO 1: X es terminal
      if (this.esTerminal(X)) {
        if (X === a) {
          // MATCH: Terminal coincide con entrada
          pasoInfo.accion = 'MATCH terminal: ' + X + ' = ' + a;
          historialPasos.push(pasoInfo);
          
          // Actualizar nodo del arbol con el valor del token
          if (nodoActual) {
            nodoActual.valor = tokenActual.valor;
            nodoActual.token = tokenActual;
          }
          
          // Pop de ambas pilas
          pila.pop();
          pilaArbol.pop();
          
          // Avanzar en la entrada
          indiceSimbolo++;
          
          if (this.opciones.debug) {
            console.log('[ParserLL1] Match exitoso:', X);
          }
          
        } else {
          // ERROR: Terminal no coincide
          pasoInfo.accion = 'ERROR - Se esperaba ' + X + ' pero se encontro ' + a;
          historialPasos.push(pasoInfo);
          
          return {
            aceptada: false,
            error: {
              tipo: 'Error Sintactico',
              mensaje: 'Se esperaba "' + X + '" pero se encontro "' + a + '"',
              esperado: X,
              encontrado: a,
              tokenEncontrado: tokenActual,
              posicion: tokenActual ? tokenActual.posicion : -1,
              linea: tokenActual ? tokenActual.linea : -1,
              columna: tokenActual ? tokenActual.columna : -1
            },
            pasos: pasos,
            historial: historialPasos
          };
        }
        
      // CASO 2: X es no terminal
      } else if (this.esNoTerminal(X)) {
        // Buscar en la tabla M[X, a]
        const entradaTabla = this.buscarEnTabla(X, a);
        
        if (entradaTabla && entradaTabla.ladoDerecho) {
          // Produccion encontrada
          pasoInfo.accion = 'PRODUCCION: ' + entradaTabla.produccion;
          historialPasos.push(pasoInfo);
          
          // Actualizar nodo del arbol
          if (nodoActual) {
            nodoActual.produccionUsada = entradaTabla.produccion;
          }
          
          // Pop de ambas pilas
          pila.pop();
          pilaArbol.pop();
          
          // Push de la produccion en orden INVERSO (para que el primero quede en el tope)
          const ladoDerecho = entradaTabla.ladoDerecho;
          
          // Crear nodos hijos para el arbol
          const nodosHijos = [];
          
          for (let i = ladoDerecho.length - 1; i >= 0; i--) {
            const simbolo = ladoDerecho[i];
            
            // No apilar EPSILON, pero si crear nodo en el arbol
            if (!this.esEpsilon(simbolo)) {
              pila.push(simbolo);
              
              const nuevoNodo = {
                simbolo: simbolo,
                esTerminal: this.esTerminal(simbolo),
                hijos: [],
                valor: null
              };
              
              pilaArbol.push(nuevoNodo);
              nodosHijos.unshift(nuevoNodo); // Agregar al inicio para mantener orden
            } else {
              // EPSILON: crear nodo especial
              nodosHijos.unshift({
                simbolo: EPSILON,
                esTerminal: true,
                esEpsilon: true,
                hijos: [],
                valor: EPSILON
              });
            }
          }
          
          // Agregar hijos al nodo actual
          if (nodoActual) {
            nodoActual.hijos = nodosHijos;
          }
          
          if (this.opciones.debug) {
            console.log('[ParserLL1] Expandiendo:', X, '->', ladoDerecho.join(' '));
          }
          
        } else {
          // ERROR: Celda vacia en la tabla
          pasoInfo.accion = 'ERROR - No hay produccion para M[' + X + ', ' + a + ']';
          historialPasos.push(pasoInfo);
          
          // Calcular que se esperaba
          const esperados = this.obtenerEsperados(X);
          
          return {
            aceptada: false,
            error: {
              tipo: 'Error Sintactico',
              mensaje: 'No existe produccion valida para (' + X + ', ' + a + ')',
              noTerminal: X,
              tokenEncontrado: tokenActual,
              esperados: esperados,
              posicion: tokenActual ? tokenActual.posicion : -1,
              linea: tokenActual ? tokenActual.linea : -1,
              columna: tokenActual ? tokenActual.columna : -1,
              sugerencia: 'Se esperaba uno de: ' + esperados.join(', ')
            },
            pasos: pasos,
            historial: historialPasos
          };
        }
        
      } else {
        // Simbolo desconocido en la pila
        return {
          aceptada: false,
          error: {
            tipo: 'Error Interno',
            mensaje: 'Simbolo desconocido en la pila: ' + X
          },
          pasos: pasos,
          historial: historialPasos
        };
      }
    }
    
    // Limite de pasos alcanzado
    if (pasos >= this.opciones.maxPasos) {
      return {
        aceptada: false,
        error: {
          tipo: 'Error de Limite',
          mensaje: 'Se alcanzo el limite maximo de pasos (' + this.opciones.maxPasos + '). Posible ciclo infinito.'
        },
        pasos: pasos,
        historial: historialPasos
      };
    }
    
    // No deberia llegar aqui
    return {
      aceptada: false,
      error: {
        tipo: 'Error Interno',
        mensaje: 'El analisis termino de forma inesperada'
      },
      pasos: pasos,
      historial: historialPasos
    };
  }

  /**
   * Buscar una entrada en la tabla LL(1)
   * 
   * @param {String} noTerminal - Simbolo no terminal (fila)
   * @param {String} terminal - Simbolo terminal (columna)
   * @returns {Object|null} Entrada de la tabla o null
   */
  buscarEnTabla(noTerminal, terminal) {
    if (!this.tabla[noTerminal]) {
      return null;
    }
    
    const entrada = this.tabla[noTerminal][terminal];
    
    if (!entrada) {
      return null;
    }
    
    return entrada;
  }

  /**
   * Obtener los terminales esperados para un no terminal
   * (terminales que tienen produccion valida)
   */
  obtenerEsperados(noTerminal) {
    const esperados = [];
    
    if (this.tabla[noTerminal]) {
      for (const terminal in this.tabla[noTerminal]) {
        if (this.tabla[noTerminal][terminal]) {
          esperados.push(terminal);
        }
      }
    }
    
    return esperados;
  }

  /**
   * Limpiar el arbol para presentacion (remover propiedades internas)
   */
  limpiarArbol(nodo) {
    if (!nodo) return null;
    
    const nodoLimpio = {
      simbolo: nodo.simbolo,
      esTerminal: nodo.esTerminal
    };
    
    if (nodo.valor !== undefined && nodo.valor !== null) {
      nodoLimpio.valor = nodo.valor;
    }
    
    if (nodo.esEpsilon) {
      nodoLimpio.esEpsilon = true;
    }
    
    if (nodo.produccionUsada) {
      nodoLimpio.produccion = nodo.produccionUsada;
    }
    
    if (nodo.hijos && nodo.hijos.length > 0) {
      nodoLimpio.hijos = nodo.hijos.map(hijo => this.limpiarArbol(hijo));
    }
    
    return nodoLimpio;
  }

  /**
   * Generar representacion textual del arbol (para debugging)
   */
  arbolATexto(nodo, prefijo = '', esUltimo = true) {
    if (!nodo) return '';
    
    let resultado = prefijo;
    resultado += esUltimo ? '└── ' : '├── ';
    resultado += nodo.simbolo;
    
    if (nodo.valor && nodo.simbolo !== nodo.valor) {
      resultado += ' [' + nodo.valor + ']';
    }
    
    resultado += '\n';
    
    if (nodo.hijos && nodo.hijos.length > 0) {
      const nuevoPrefijo = prefijo + (esUltimo ? '    ' : '│   ');
      
      for (let i = 0; i < nodo.hijos.length; i++) {
        const esUltimoHijo = i === nodo.hijos.length - 1;
        resultado += this.arbolATexto(nodo.hijos[i], nuevoPrefijo, esUltimoHijo);
      }
    }
    
    return resultado;
  }
}

module.exports = ParserLL1;
module.exports.EPSILON = EPSILON;
module.exports.FIN_CADENA = FIN_CADENA;