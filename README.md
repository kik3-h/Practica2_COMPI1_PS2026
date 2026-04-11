# WisonCompiler_EH

WisonCompiler_EH es una aplicación académica para la construcción y prueba de analizadores sintácticos LL(1) a partir del lenguaje Wison. El sistema permite definir gramáticas, validarlas, calcular conjuntos PRIMERO/SIGUIENTE, construir la tabla LL(1) y evaluar cadenas de entrada con generación de árbol de derivación.

## Arquitectura Cliente-Servidor

El proyecto implementa una arquitectura cliente-servidor:

- **Frontend (Cliente):** Svelte + Vite + Monaco Editor + D3.js.
- **Backend (Servidor):** Node.js + Express + Jison + motor LL(1) propio.

El frontend consume endpoints REST del backend (`/api/compile` y `/api/parse`) para compilar gramáticas y analizar cadenas.

## Prerrequisitos

- Node.js v18 o superior.
- npm (incluido con Node.js).

## Instalación y ejecución

La ejecución se realiza con dos terminales (una para backend y otra para frontend).

### 1. Terminal 1: Backend

```bash
cd backend
npm install
npm run dev
```

El backend quedará disponible en:

- `http://localhost:3000`
- `http://localhost:3000/health`

### 2. Terminal 2: Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend quedará disponible en:

- `http://localhost:5173`

## Endpoints principales del backend

- `POST /api/compile`: Compila código Wison, genera AST y análisis LL(1).
- `POST /api/parse`: Analiza una cadena de entrada con la gramática definida.
- `GET /api/parsers`: Información de analizadores disponibles.
- `GET /api/info`: Información general del sistema.

## Estructura general

```text
backend/
  src/
    server.js
    controllers/compilerController.js
    ll1-engine/{llEngine.js, lexer.js, parser.js}
    jison/wison.jison
    routes/compilerRoutes.js

frontend/
  src/
    App.svelte
    lib/{EditorWison.svelte, VistaGramaticas.svelte}
    services/api.js
    stores/grammarStore.js
```
