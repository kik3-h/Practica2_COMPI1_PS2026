const express = require('express');
const cors = require('cors');
const compilerRoutes = require('./routes/compilerRoutes');

/**
 * WisonCompiler_EH - Servidor Backend
 * 
 * Servidor Express que maneja el analisis lexico y sintactico del lenguaje Wison
 * utilizando Jison como herramienta base para la generacion de parsers.
 * Incluye motor LL(1) para calculo de PRIMERO, SIGUIENTE y tabla de analisis.
 * 
 * Autor: Sistema de Compiladores LL(1)
 * Curso: Organizacion de Lenguajes y Compiladores 1
 * Version: 2.0.0
 */

class WisonServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Configuracion de middlewares basicos del servidor
   */
  initializeMiddlewares() {
    // Habilitar CORS para permitir conexiones desde el frontend
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:4173'], // Puertos tipicos de Vite
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Parser de JSON para requests del frontend
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parser de URL encoded para formularios
    this.app.use(express.urlencoded({ extended: true }));

    // Logging basico de requests
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log('[' + timestamp + '] ' + req.method + ' ' + req.url);
      next();
    });
  }

  /**
   * Configuracion de rutas principales del API
   */
  initializeRoutes() {
    // Ruta de health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        message: 'WisonCompiler_EH Backend esta funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
    });

    // Rutas del compilador Wison
    this.app.use('/api', compilerRoutes);

    // Ruta por defecto para rutas no encontradas
    this.app.use((req, res, next) => {
      res.status(404).json({
        error: 'Ruta no encontrada',
        message: 'La ruta ' + req.originalUrl + ' no existe en el servidor',
        availableRoutes: [
          'GET /health',
          'POST /api/compile',
          'GET /api/parsers',
          'GET /api/info'
        ]
      });
    });
  }

  /**
   * Manejo global de errores del servidor
   */
  initializeErrorHandling() {
    this.app.use((error, req, res, next) => {
      console.log('[Server] Error no manejado:', error.message);
      
      res.status(error.status || 500).json({
        error: 'Error interno del servidor',
        message: error.message || 'Ocurrio un error inesperado',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  /**
   * Iniciar el servidor en el puerto especificado
   */
  start() {
    this.app.listen(this.port, () => {
      console.log('============================================================');
      console.log('WisonCompiler_EH Backend v2.0.0 Iniciado');
      console.log('============================================================');
      console.log('Servidor escuchando en puerto: ' + this.port);
      console.log('URL del servidor: http://localhost:' + this.port);
      console.log('Health Check: http://localhost:' + this.port + '/health');
      console.log('API Compilador: http://localhost:' + this.port + '/api/compile');
      console.log('Funcionalidades: Jison Parser + Motor LL(1)');
      console.log('============================================================');
    });
  }
}

// Crear e iniciar el servidor
const server = new WisonServer();
server.start();

module.exports = WisonServer;