/**
 * WisonCompiler_EH - Modulo Motor LL(1)
 * 
 * Punto de entrada del modulo ll1-engine.
 * Exporta todas las clases y utilidades del motor LL(1).
 * 
 * Componentes:
 * - LLEngine: Calculo de PRIMERO, SIGUIENTE y Tabla LL(1)
 * - Lexer: Tokenizacion de cadenas de entrada
 * - ParserLL1: Analisis predictivo descendente con arbol de derivacion
 * 
 * @author Sistema de Compiladores - Organizacion de Lenguajes y Compiladores 1
 * @version 2.0.0
 */

const LLEngine = require('./llEngine');
const Lexer = require('./lexer');
const ParserLL1 = require('./parser');

module.exports = {
  LLEngine,
  Lexer,
  ParserLL1,
  EPSILON: LLEngine.EPSILON,
  FIN_CADENA: LLEngine.FIN_CADENA
};