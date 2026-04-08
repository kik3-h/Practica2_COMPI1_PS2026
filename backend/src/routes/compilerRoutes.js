/**
 * WisonCompiler_EH - Rutas del Compilador
 * 
 * Define todas las rutas del API REST para el sistema de compilacion Wison.
 * Maneja endpoints para analisis lexico, sintactico y operaciones del compilador.
 * 
 * @author Sistema de Compiladores - Organizacion de Lenguajes y Compiladores 1
 * @version 3.0.0
 */

const express = require('express');
const compilerController = require('../controllers/compilerController');

const router = express.Router();

/**
 * Middleware de validacion para requests del compilador
 */
const validateCompilerRequest = (req, res, next) => {
  // Log de la request para debugging
  console.log('[API] Request: ' + req.method + ' ' + req.originalUrl);
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[API] Body recibido:', {
      keys: Object.keys(req.body),
      codeLength: req.body.code ? req.body.code.length : 0,
      inputLength: req.body.input ? req.body.input.length : 0
    });
  }

  // Agregar headers de respuesta comunes
  res.set({
    'X-Compiler': 'WisonCompiler_EH',
    'X-Version': '3.0.0',
    'X-API-Timestamp': new Date().toISOString()
  });

  next();
};

// Aplicar middleware a todas las rutas
router.use(validateCompilerRequest);

/**
 * POST /api/compile
 * Compilar codigo Wison y generar AST con analisis LL(1)
 * 
 * Body:
 * {
 *   "code": "string - Codigo Wison a compilar",
 *   "filename": "string - Nombre del archivo (opcional)",
 *   "skipLL1": "boolean - Si true, omite el analisis LL(1) (opcional)"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "ast": {...},
 *   "grammar": {...},
 *   "ll1": {...}
 * }
 */
router.post('/compile', async (req, res) => {
  await compilerController.compileWison(req, res);
});

/**
 * POST /api/parse
 * Analizar una cadena de entrada usando la gramatica Wison definida
 * 
 * Body:
 * {
 *   "code": "string - Codigo Wison que define la gramatica",
 *   "input": "string - Cadena a evaluar con la gramatica"
 * }
 * 
 * Response exitosa:
 * {
 *   "success": true,
 *   "aceptada": true,
 *   "arbolDerivacion": {...},
 *   "entrada": { "cadena": "...", "tokens": [...] },
 *   "historialPasos": [...]
 * }
 * 
 * Response error:
 * {
 *   "success": false,
 *   "aceptada": false,
 *   "error": {...},
 *   "fase": "Tokenizacion|Parsing LL(1)|..."
 * }
 */
router.post('/parse', async (req, res) => {
  await compilerController.parseString(req, res);
});

/**
 * GET /api/parsers
 * Obtener lista de analizadores disponibles
 * 
 * Response:
 * {
 *   "success": true,
 *   "parsers": [...]
 * }
 */
router.get('/parsers', async (req, res) => {
  await compilerController.listParsers(req, res);
});

/**
 * GET /api/info
 * Obtener informacion del sistema compilador
 * 
 * Response:
 * {
 *   "success": true,
 *   "system": {...},
 *   "capabilities": {...}
 * }
 */
router.get('/info', async (req, res) => {
  await compilerController.getSystemInfo(req, res);
});

/**
 * POST /api/validate
 * Validar sintaxis de codigo Wison sin generar AST completo
 * (Funcionalidad futura para validacion rapida)
 */
router.post('/validate', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Funcionalidad no implementada',
    message: 'La validacion rapida se implementara en una fase posterior',
    suggestedEndpoint: '/api/compile'
  });
});

/**
 * POST /api/parse-string (Alias de /api/parse)
 * Mantiene compatibilidad con implementaciones anteriores
 */
router.post('/parse-string', async (req, res) => {
  await compilerController.parseString(req, res);
});

/**
 * Middleware de manejo de errores para las rutas del compilador
 */
router.use((error, req, res, next) => {
  console.log('[API] Error en ruta ' + req.originalUrl + ':', error.message);
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Error en el API del compilador',
    message: error.message || 'Error interno del servidor',
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;