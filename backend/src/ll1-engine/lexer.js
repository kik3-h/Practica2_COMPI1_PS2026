/**
 * WisonCompiler_EH - Tokenizador (Lexer) para Cadenas de Entrada
 * 
 * Este modulo se encarga de convertir una cadena de entrada del usuario
 * en un arreglo de tokens validos basados en las definiciones de terminales
 * especificadas en el codigo Wison.
 * 
 * Funcionamiento:
 * 1. Recibe la cadena de entrada y la lista de terminales con sus expresiones
 * 2. Intenta hacer match desde el inicio de la cadena con cada terminal
 * 3. Consume el match mas largo encontrado (Longest Match)
 * 4. Repite hasta consumir toda la cadena o encontrar error
 * 
 * @author Sistema de Compiladores - Organizacion de Lenguajes y Compiladores 1
 * @version 1.0.0
 */

class Lexer {
  /**
   * Constructor del Tokenizador
   * 
   * @param {Array} terminales - Lista de terminales con nombre y expresion
   *        Formato: [{ name: '$_NUMERO', expression: { type: '...', ... } }, ...]
   * @param {Object} opciones - Opciones de configuracion
   */
  constructor(terminales, opciones = {}) {
    this.terminales = terminales || [];
    this.opciones = {
      ignorarEspacios: opciones.ignorarEspacios !== false, // Por defecto ignora espacios
      debug: opciones.debug || false
    };
    
    // Compilar las expresiones regulares de los terminales
    this.patronesCompilados = this.compilarPatrones();
    
    if (this.opciones.debug) {
      console.log('[Lexer] Inicializado con', this.terminales.length, 'terminales');
    }
  }

  /**
   * Compilar las expresiones de los terminales a RegExp de JavaScript
   * 
   * Convierte las expresiones del AST de Wison a expresiones regulares
   * nativas de JavaScript para poder hacer matching.
   */
  compilarPatrones() {
    const patrones = [];
    
    this.terminales.forEach((terminal, indiceOriginal) => {
      try {
        const regex = this.expresionARegex(terminal.expression);
        const esEstatico = this.esPatronEstatico(terminal.expression);
        const prioridad = esEstatico ? 0 : 1;

        patrones.push({
          nombre: terminal.name,
          regex: new RegExp('^(' + regex + ')', 'u'), // Anclar al inicio
          expresionOriginal: terminal.expression,
          prioridad: prioridad,
          indiceOriginal: indiceOriginal
        });
        
        if (this.opciones.debug) {
          console.log('[Lexer] Patron compilado:', terminal.name, '->', regex, '| prioridad:', prioridad);
        }
      } catch (error) {
        console.log('[Lexer] Error compilando patron para', terminal.name, ':', error.message);
      }
    });

    patrones.sort((a, b) => {
      if (a.prioridad !== b.prioridad) {
        return a.prioridad - b.prioridad;
      }
      return a.indiceOriginal - b.indiceOriginal;
    });
    
    return patrones;
  }

  /**
   * Determina si un patron representa una cadena estatica.
   *
   * Los patrones estaticos (por ejemplo 'DEFINE') se priorizan
   * sobre patrones genericos (por ejemplo [a-zA-Z]+).
   */
  esPatronEstatico(expr, visitados = new Set()) {
    if (!expr || typeof expr !== 'object') {
      return false;
    }

    switch (expr.type) {
      case 'StringLiteral':
        return true;

      case 'GroupExpression':
        return this.esPatronEstatico(expr.expression, visitados);

      case 'ConcatenationExpression':
        return this.esPatronEstatico(expr.left, visitados) && this.esPatronEstatico(expr.right, visitados);

      case 'TerminalReference': {
        if (!expr.name || visitados.has(expr.name)) {
          return false;
        }

        const terminalReferenciado = this.terminales.find((terminal) => terminal.name === expr.name);
        if (!terminalReferenciado) {
          return false;
        }

        visitados.add(expr.name);
        const esEstatico = this.esPatronEstatico(terminalReferenciado.expression, visitados);
        visitados.delete(expr.name);
        return esEstatico;
      }

      default:
        return false;
    }
  }

  /**
   * Convertir expresion del AST de Wison a string de regex
   * 
   * Traduce la estructura del AST a sintaxis de expresiones regulares
   * de JavaScript.
   * 
   * @param {Object} expr - Nodo de expresion del AST
   * @returns {String} Expresion regular como string
   */
  expresionARegex(expr) {
    if (!expr) return '';
    
    switch (expr.type) {
      case 'StringLiteral':
        // Extraer el contenido entre comillas y escapar caracteres especiales
        let valor = expr.value;
        // Remover comillas simples si las tiene
        if (valor.startsWith("'") && valor.endsWith("'")) {
          valor = valor.slice(1, -1);
        }
        return this.escaparRegex(valor);
        
      case 'CharacterRange':
        // [aA-zZ] o [0-9]
        if (expr.range === 'aA-zZ') {
          return '[a-zA-Z]';
        } else if (expr.range === '0-9') {
          return '[0-9]';
        }
        return '[' + expr.range + ']';
        
      case 'KleeneStarExpression':
        // Cero o mas veces: expr*
        return '(' + this.expresionARegex(expr.expression) + ')*';
        
      case 'KleenePlusExpression':
        // Una o mas veces: expr+
        return '(' + this.expresionARegex(expr.expression) + ')+';
        
      case 'OptionalExpression':
        // Cero o una vez: expr?
        return '(' + this.expresionARegex(expr.expression) + ')?';
        
      case 'OrExpression':
        // Alternativa: expr1 | expr2
        return '(' + this.expresionARegex(expr.left) + '|' + this.expresionARegex(expr.right) + ')';
        
      case 'ConcatenationExpression':
        // Concatenacion: expr1 expr2
        return this.expresionARegex(expr.left) + this.expresionARegex(expr.right);
        
      case 'GroupExpression':
        // Agrupacion: (expr)
        return '(' + this.expresionARegex(expr.expression) + ')';
        
      case 'TerminalReference':
        // Referencia a otro terminal - buscar su patron
        const termRef = this.terminales.find(t => t.name === expr.name);
        if (termRef) {
          return this.expresionARegex(termRef.expression);
        }
        console.log('[Lexer] Advertencia: Terminal referenciado no encontrado:', expr.name);
        return '';
        
      default:
        console.log('[Lexer] Tipo de expresion no soportado:', expr.type);
        return '';
    }
  }

  /**
   * Escapar caracteres especiales de regex
   */
  escaparRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Tokenizar una cadena de entrada
   * 
   * ALGORITMO:
   * 1. Mientras haya texto por procesar:
   *    a. Si se ignoran espacios, consumir espacios/tabs/saltos
   *    b. Intentar match con cada patron de terminal
   *    c. Elegir el match mas largo (Longest Match Rule)
   *    d. Si hay match, crear token y avanzar posicion
   *    e. Si no hay match, reportar Error Lexico
   * 2. Agregar token de fin de cadena ($)
   * 
   * @param {String} entrada - Cadena de texto a tokenizar
   * @returns {Object} Resultado con tokens o errores
   */
  tokenizar(entrada) {
    const tokens = [];
    const errores = [];
    let posicion = 0;
    let linea = 1;
    let columna = 1;
    
    if (this.opciones.debug) {
      console.log('[Lexer] Tokenizando entrada de', entrada.length, 'caracteres');
    }
    
    while (posicion < entrada.length) {
      // Ignorar espacios en blanco si esta configurado
      if (this.opciones.ignorarEspacios) {
        const espacios = this.consumirEspacios(entrada, posicion);
        if (espacios.consumidos > 0) {
          // Actualizar posicion y contadores de linea/columna
          for (let i = 0; i < espacios.consumidos; i++) {
            const char = entrada[posicion + i];
            if (char === '\n') {
              linea++;
              columna = 1;
            } else {
              columna++;
            }
          }
          posicion += espacios.consumidos;
          continue;
        }
      }
      
      // Si llegamos al final despues de consumir espacios
      if (posicion >= entrada.length) {
        break;
      }
      
      // Intentar match con cada patron
      let mejorMatch = null;
      let mejorLongitud = 0;
      let mejorNombre = null;
      let mejorPrioridad = Number.POSITIVE_INFINITY;
      
      const textoRestante = entrada.substring(posicion);
      
      for (const patron of this.patronesCompilados) {
        const match = textoRestante.match(patron.regex);
        
        if (
          match &&
          (
            match[0].length > mejorLongitud ||
            (match[0].length === mejorLongitud && patron.prioridad < mejorPrioridad)
          )
        ) {
          mejorMatch = match[0];
          mejorLongitud = match[0].length;
          mejorNombre = patron.nombre;
          mejorPrioridad = patron.prioridad;
        }
      }
      
      if (mejorMatch) {
        // Crear token
        tokens.push({
          tipo: mejorNombre,
          valor: mejorMatch,
          posicion: posicion,
          linea: linea,
          columna: columna
        });
        
        if (this.opciones.debug) {
          console.log('[Lexer] Token encontrado:', mejorNombre, '=', mejorMatch);
        }
        
        // Actualizar posicion y columna
        for (let i = 0; i < mejorLongitud; i++) {
          if (mejorMatch[i] === '\n') {
            linea++;
            columna = 1;
          } else {
            columna++;
          }
        }
        posicion += mejorLongitud;
        
      } else {
        // Error Lexico: caracter no reconocido
        const caracterProblematico = entrada[posicion];
        const contexto = entrada.substring(Math.max(0, posicion - 5), Math.min(entrada.length, posicion + 10));
        
        const error = {
          tipo: 'Error Lexico',
          mensaje: 'Caracter no reconocido: "' + caracterProblematico + '"',
          caracter: caracterProblematico,
          posicion: posicion,
          linea: linea,
          columna: columna,
          contexto: contexto
        };
        
        errores.push(error);
        
        if (this.opciones.debug) {
          console.log('[Lexer] Error:', error.mensaje, 'en linea', linea, 'columna', columna);
        }
        
        // Avanzar para intentar recuperar
        posicion++;
        columna++;
      }
    }
    
    // Agregar token de fin de cadena
    tokens.push({
      tipo: '$',
      valor: '$',
      posicion: posicion,
      linea: linea,
      columna: columna,
      esFin: true
    });
    
    return {
      exito: errores.length === 0,
      tokens: tokens,
      errores: errores,
      totalTokens: tokens.length,
      longitudEntrada: entrada.length
    };
  }

  /**
   * Consumir espacios en blanco desde una posicion
   */
  consumirEspacios(texto, posicion) {
    const textoRestante = texto.slice(posicion);
    const match = textoRestante.match(/^\s+/u);
    return { consumidos: match ? match[0].length : 0 };
  }

  /**
   * Obtener informacion de los patrones compilados
   */
  obtenerPatrones() {
    return this.patronesCompilados.map(p => ({
      nombre: p.nombre,
      patron: p.regex.source
    }));
  }
}

module.exports = Lexer;
