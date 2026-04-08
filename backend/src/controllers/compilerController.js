/**
 * WisonCompiler_EH - Controlador del Compilador
 * 
 * Maneja las peticiones relacionadas con el analisis y compilacion
 * de codigo Wison utilizando el parser generado por Jison.
 * 
 * Este controlador integra:
 * - Analisis lexico y sintactico via Jison
 * - Motor LL(1) para calculo de PRIMERO, SIGUIENTE y tabla de analisis
 * - Tokenizador para cadenas de entrada
 * - Parser LL(1) predictivo descendente con arbol de derivacion
 * 
 * @author Sistema de Compiladores - Organizacion de Lenguajes y Compiladores 1
 * @version 3.0.0
 */

const fs = require('fs');
const path = require('path');
const LLEngine = require('../ll1-engine/llEngine');
const Lexer = require('../ll1-engine/lexer');
const ParserLL1 = require('../ll1-engine/parser');

class CompilerController {
  constructor() {
    this.wisonParser = null;
    this.loadWisonParser();
  }

  /**
   * Cargar el parser de Wison generado por Jison
   */
  loadWisonParser() {
    try {
      const parserPath = path.join(__dirname, '../jison/wison.js');
      
      if (fs.existsSync(parserPath)) {
        // Eliminar cache si existe para recargar el parser
        delete require.cache[require.resolve(parserPath)];
        this.wisonParser = require(parserPath);
        console.log('[CompilerController] Parser Wison cargado correctamente');
      } else {
        console.warn('[CompilerController] Parser Wison no encontrado. Ejecuta: npx jison src/jison/wison.jison -o src/jison/wison.js');
        this.wisonParser = null;
      }
    } catch (error) {
      console.error('[CompilerController] Error cargando el parser Wison:', error.message);
      this.wisonParser = null;
    }
  }

  /**
   * Compilar codigo Wison, generar AST y ejecutar analisis LL(1)
   * POST /api/compile
   */
  async compileWison(req, res) {
    try {
      const { code, filename = 'untitled.wison', skipLL1 = false } = req.body;

      // Validar entrada
      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Codigo Wison requerido',
          message: 'Debe proporcionar codigo Wison valido en el campo "code"',
          details: {
            received: typeof code,
            expected: 'string'
          }
        });
      }

      // Verificar que el parser este disponible
      if (!this.wisonParser) {
        this.loadWisonParser(); // Intentar cargar nuevamente
        
        if (!this.wisonParser) {
          return res.status(500).json({
            success: false,
            error: 'Parser no disponible',
            message: 'El parser de Wison no esta disponible. Asegurate de haber compilado el archivo .jison',
            solution: 'Ejecuta: npx jison src/jison/wison.jison -o src/jison/wison.js'
          });
        }
      }

      console.log('[CompilerController] Analizando codigo Wison (' + filename + ')...');
      console.log('[CompilerController] Longitud del codigo:', code.length, 'caracteres');

      // FASE 1: Analisis Lexico y Sintactico con Jison
      const startTime = Date.now();
      const ast = this.wisonParser.parse(code);
      const parseTime = Date.now() - startTime;

      console.log('[CompilerController] Analisis lexico/sintactico completado en', parseTime, 'ms');

      // Extraer informacion del AST para la respuesta
      const grammarInfo = this.extractGrammarInfo(ast);

      // FASE 2: Analisis LL(1) con el Motor
      let analisisLL1 = null;
      let ll1Time = 0;

      if (!skipLL1) {
        try {
          console.log('[CompilerController] Iniciando analisis LL(1)...');
          const ll1StartTime = Date.now();
          
          // Crear instancia del motor LL(1) y ejecutar analisis
          const motorLL1 = new LLEngine(ast);
          analisisLL1 = motorLL1.analizarGramatica();
          
          ll1Time = Date.now() - ll1StartTime;
          console.log('[CompilerController] Analisis LL(1) completado en', ll1Time, 'ms');
          
        } catch (ll1Error) {
          console.log('[CompilerController] Error en analisis LL(1):', ll1Error.message);
          analisisLL1 = {
            exito: false,
            error: ll1Error.message,
            mensaje: 'Error durante el analisis LL(1)'
          };
        }
      }

      // Respuesta exitosa completa
      return res.json({
        success: true,
        message: 'Codigo Wison analizado correctamente',
        filename: filename,
        tiempos: {
          parseTime: parseTime,
          ll1Time: ll1Time,
          totalTime: parseTime + ll1Time
        },
        ast: ast,
        grammar: grammarInfo,
        ll1: analisisLL1,
        esGramaticaLL1: analisisLL1 ? analisisLL1.esGramaticaLL1 : null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.log('[CompilerController] Error en compilacion Wison:', error.message);

      // Determinar tipo de error
      let errorType = 'Error Desconocido';
      let line = null;
      let column = null;

      if (error.hash) {
        // Error de Jison con informacion de posicion
        errorType = 'Error de Analisis Sintactico';
        line = error.hash.line;
        column = error.hash.loc?.first_column;
      } else if (error.message.includes('Lexical error')) {
        errorType = 'Error Lexico';
      } else if (error.message.includes('Parse error') || error.message.includes('Expecting')) {
        errorType = 'Error Sintactico';
      }

      return res.status(400).json({
        success: false,
        error: errorType,
        message: error.message,
        details: {
          line: line,
          column: column,
          expected: error.expected || null,
          token: error.token || null,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Extraer informacion de gramatica del AST
   */
  extractGrammarInfo(ast) {
    const info = {
      terminals: [],
      nonTerminals: [],
      productions: [],
      initialSymbol: null,
      summary: {
        totalTerminals: 0,
        totalNonTerminals: 0,
        totalProductions: 0
      }
    };

    try {
      // Extraer terminales del bloque lexico
      if (ast.terminals && Array.isArray(ast.terminals)) {
        info.terminals = ast.terminals.map(terminal => ({
          name: terminal.name,
          expression: this.stringifyExpression(terminal.expression),
          type: 'Terminal'
        }));
      }

      // Extraer no terminales
      if (ast.nonTerminals && Array.isArray(ast.nonTerminals)) {
        info.nonTerminals = ast.nonTerminals.map(nt => ({
          name: nt.name,
          type: 'NonTerminal'
        }));
      }

      // Extraer simbolo inicial
      info.initialSymbol = ast.initialSymbol;

      // Extraer producciones
      if (ast.productions && Array.isArray(ast.productions)) {
        info.productions = ast.productions.map(prod => ({
          leftSide: prod.leftSide,
          rightSides: prod.rightSides.map(rs => ({
            symbols: rs.symbols.map(sym => sym.name || sym.value),
            symbolsDetailed: rs.symbols
          })),
          type: 'Production'
        }));
      }

      // Calcular estadisticas
      info.summary.totalTerminals = info.terminals.length;
      info.summary.totalNonTerminals = info.nonTerminals.length;
      info.summary.totalProductions = info.productions.length;

    } catch (error) {
      console.log('[CompilerController] Error extrayendo informacion de gramatica:', error.message);
    }

    return info;
  }

  /**
   * Convertir expresion del AST a string legible
   */
  stringifyExpression(expr) {
    if (!expr) return '';

    switch (expr.type) {
      case 'StringLiteral':
        return expr.value;
      case 'CharacterRange':
        return '[' + expr.range + ']';
      case 'KleeneStarExpression':
        return this.stringifyExpression(expr.expression) + '*';
      case 'KleenePlusExpression':
        return this.stringifyExpression(expr.expression) + '+';
      case 'OptionalExpression':
        return this.stringifyExpression(expr.expression) + '?';
      case 'OrExpression':
        return this.stringifyExpression(expr.left) + '|' + this.stringifyExpression(expr.right);
      case 'ConcatenationExpression':
        return this.stringifyExpression(expr.left) + this.stringifyExpression(expr.right);
      case 'GroupExpression':
        return '(' + this.stringifyExpression(expr.expression) + ')';
      case 'TerminalReference':
        return expr.name;
      default:
        return JSON.stringify(expr);
    }
  }

  /**
   * Listar analizadores disponibles
   * GET /api/parsers
   */
  async listParsers(req, res) {
    try {
      return res.json({
        success: true,
        parsers: [
          {
            name: 'Wison Parser',
            version: '2.0.0',
            status: this.wisonParser ? 'Disponible' : 'No Compilado',
            description: 'Analizador lexico y sintactico para el lenguaje Wison con soporte LL(1)',
            capabilities: [
              'Analisis lexico de terminales',
              'Analisis sintactico de gramaticas libres de contexto',
              'Generacion de AST',
              'Deteccion de errores lexicos y sintacticos',
              'Calculo de conjuntos PRIMERO',
              'Calculo de conjuntos SIGUIENTE',
              'Construccion de tabla LL(1)',
              'Deteccion de conflictos LL(1)'
            ]
          }
        ],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('[CompilerController] Error listando parsers:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Error interno',
        message: 'No se pudieron listar los analizadores disponibles'
      });
    }
  }

  /**
   * Obtener informacion del sistema
   * GET /api/info
   */
  async getSystemInfo(req, res) {
    try {
      return res.json({
        success: true,
        system: {
          name: 'WisonCompiler_EH',
          version: '3.0.0',
          description: 'Compilador para el lenguaje Wison con analisis LL(1)',
          author: 'Sistema de Compiladores',
          course: 'Organizacion de Lenguajes y Compiladores 1'
        },
        capabilities: {
          lexicalAnalysis: true,
          syntacticAnalysis: true,
          astGeneration: true,
          errorDetection: true,
          ll1Analysis: true,
          firstSets: true,
          followSets: true,
          ll1Table: true,
          conflictDetection: true,
          inputParsing: true,
          derivationTree: true
        },
        parserStatus: this.wisonParser ? 'Operativo' : 'Requiere Compilacion',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo informacion del sistema'
      });
    }
  }

  /**
   * Analizar una cadena de entrada usando un analizador generado
   * POST /api/parse
   * 
   * Este endpoint realiza el flujo completo:
   * 1. Compila el codigo Wison y genera la tabla LL(1)
   * 2. Tokeniza la cadena de entrada usando los terminales definidos
   * 3. Ejecuta el parser LL(1) predictivo descendente
   * 4. Genera el arbol de derivacion si la cadena es aceptada
   * 
   * Body esperado:
   * {
   *   "code": "string - Codigo Wison que define la gramatica",
   *   "input": "string - Cadena a evaluar con la gramatica"
   * }
   */
  async parseString(req, res) {
    try {
      const { code, input, filename = 'untitled.wison' } = req.body;

      // Validar entradas
      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Codigo Wison requerido',
          message: 'Debe proporcionar codigo Wison valido en el campo "code"'
        });
      }

      if (input === undefined || input === null) {
        return res.status(400).json({
          success: false,
          error: 'Cadena de entrada requerida',
          message: 'Debe proporcionar una cadena a analizar en el campo "input"'
        });
      }

      // Verificar parser Jison
      if (!this.wisonParser) {
        this.loadWisonParser();
        if (!this.wisonParser) {
          return res.status(500).json({
            success: false,
            error: 'Parser no disponible',
            message: 'El parser de Wison no esta disponible',
            solution: 'Ejecuta: npx jison src/jison/wison.jison -o src/jison/wison.js'
          });
        }
      }

      console.log('[CompilerController] Parseando cadena de entrada...');
      console.log('[CompilerController] Codigo Wison:', code.length, 'caracteres');
      console.log('[CompilerController] Cadena entrada:', input.length, 'caracteres');

      const tiempoInicio = Date.now();

      // PASO 1: Compilar el codigo Wison
      let ast;
      try {
        ast = this.wisonParser.parse(code);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          fase: 'Compilacion Wison',
          error: 'Error Sintactico en codigo Wison',
          message: parseError.message,
          details: {
            line: parseError.hash ? parseError.hash.line : null,
            column: parseError.hash ? parseError.hash.loc?.first_column : null
          }
        });
      }

      // PASO 2: Ejecutar analisis LL(1) y construir tabla
      const motorLL1 = new LLEngine(ast);
      const analisisLL1 = motorLL1.analizarGramatica();

      if (!analisisLL1.exito || !analisisLL1.esGramaticaLL1) {
        return res.status(400).json({
          success: false,
          fase: 'Analisis LL(1)',
          error: 'Gramatica no es LL(1)',
          message: 'La gramatica definida no es valida para analisis LL(1)',
          conflictos: analisisLL1.tablaLL1 ? analisisLL1.tablaLL1.conflictos : [],
          errores: analisisLL1.errores
        });
      }

      console.log('[CompilerController] Gramatica LL(1) valida, procediendo a tokenizar...');

      // PASO 3: Tokenizar la cadena de entrada
      const lexer = new Lexer(ast.terminals, { debug: false });
      const resultadoLexer = lexer.tokenizar(input);

      if (!resultadoLexer.exito) {
        return res.status(400).json({
          success: false,
          fase: 'Tokenizacion',
          error: 'Error Lexico en cadena de entrada',
          message: 'La cadena de entrada contiene caracteres no reconocidos',
          erroresLexicos: resultadoLexer.errores,
          tokensHastaError: resultadoLexer.tokens.slice(0, -1) // Sin el $
        });
      }

      console.log('[CompilerController] Tokenizacion exitosa:', resultadoLexer.totalTokens, 'tokens');

      // PASO 4: Ejecutar parser LL(1) predictivo descendente
      const parser = new ParserLL1(
        analisisLL1.tablaLL1.tabla,
        analisisLL1.gramatica.simboloInicial,
        analisisLL1.gramatica.terminales,
        analisisLL1.gramatica.noTerminales,
        { debug: false }
      );

      const resultadoParser = parser.analizar(resultadoLexer.tokens);

      const tiempoTotal = Date.now() - tiempoInicio;

      console.log('[CompilerController] Analisis completado en', tiempoTotal, 'ms');
      console.log('[CompilerController] Resultado:', resultadoParser.aceptada ? 'ACEPTADA' : 'RECHAZADA');

      // Construir respuesta
      if (resultadoParser.aceptada) {
        return res.json({
          success: true,
          aceptada: true,
          mensaje: 'La cadena de entrada es valida segun la gramatica definida',
          entrada: {
            cadena: input,
            tokens: resultadoLexer.tokens.map(t => ({ tipo: t.tipo, valor: t.valor }))
          },
          analisis: {
            pasos: resultadoParser.pasos,
            tiempoMs: tiempoTotal
          },
          arbolDerivacion: resultadoParser.arbol,
          historialPasos: resultadoParser.historial,
          gramatica: {
            simboloInicial: analisisLL1.gramatica.simboloInicial,
            producciones: analisisLL1.gramatica.producciones
          },
          timestamp: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          success: false,
          aceptada: false,
          fase: 'Parsing LL(1)',
          mensaje: 'La cadena de entrada NO es valida segun la gramatica',
          entrada: {
            cadena: input,
            tokens: resultadoLexer.tokens.map(t => ({ tipo: t.tipo, valor: t.valor }))
          },
          error: resultadoParser.error,
          analisis: {
            pasos: resultadoParser.pasos,
            tiempoMs: tiempoTotal
          },
          historialPasos: resultadoParser.historial,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.log('[CompilerController] Error en parseString:', error.message);

      return res.status(500).json({
        success: false,
        error: 'Error Interno',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new CompilerController();