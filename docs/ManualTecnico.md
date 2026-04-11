# UNIVERSIDAD DE SAN CARLOS DE GUATEMALA

## CENTRO UNIVERSITARIO DE OCCIDENTE

### DIVISIÓN DE CIENCIAS DE LA INGENIERÍA

### ORGANIZACIÓN DE LENGUAJES Y COMPILADORES 1 - SEMESTRE 1 2026

---

# PRÁCTICA 2: GENERADOR LL(1) CON WISON

## MANUAL TÉCNICO

## WisonCompiler_EH

**Nombre:** Enrique Hernandez
**Carnet:** 202230026

---

## 1. Introducción

WisonCompiler_EH es una plataforma de compilación orientada a la enseñanza de análisis sintáctico descendente predictivo LL(1). El sistema integra un parser de especificaciones Wison basado en Jison, un motor matemático para cálculo de conjuntos PRIMERO y SIGUIENTE, construcción de tabla LL(1), detección de colisiones y un parser predictivo para validar cadenas de entrada, todo accesible desde una interfaz web.

La arquitectura separa responsabilidades entre un cliente web (Svelte) y un servidor de compilación (Node.js + Express), manteniendo una integración clara entre presentación, servicios API y lógica formal de compiladores.

## 2. Arquitectura del Sistema

### 2.1 Patrón arquitectónico

El proyecto implementa un patrón **Cliente-Servidor**:

1. **Cliente (Frontend):** interfaz de usuario, edición de gramáticas, persistencia local y visualización de resultados.
2. **Servidor (Backend):** compilación de gramáticas Wison, análisis LL(1), tokenización y parsing de cadenas.
3. **Comunicación:** HTTP/JSON sobre endpoints REST.

### 2.2 Capa Frontend (Svelte + Vite)

Componentes principales:

- `App.svelte`: contenedor principal con navegación por pestañas (`Inicio`, `Editor`, `Gramaticas`).
- `EditorWison.svelte`: integración de Monaco Editor, carga de archivos `.wison`, compilación y actualización de estado global.
- `VistaGramaticas.svelte`: selección de gramáticas guardadas, evaluación de cadenas y renderizado de árbol de derivación con D3.js.
- `services/api.js`: cliente HTTP para `/api/compile` y `/api/parse`.
- `stores/grammarStore.js`: stores reactivos de Svelte para gramática activa, tabla de símbolos, historial persistente y limpieza de historial.

Tecnologías y roles:

- **Svelte:** reactividad y composición de componentes.
- **Vite:** bundling y servidor de desarrollo.
- **Monaco Editor:** edición especializada de gramáticas.
- **D3.js:** visualización interactiva de árboles de derivación.
- **Bootstrap:** soporte de estilos para tablas y controles.

### 2.3 Capa Backend (Node.js + Express + Jison)

Módulos principales:

- `server.js`: clase `WisonServer`, configuración de middlewares, rutas y manejo global de errores.
- `routes/compilerRoutes.js`: definición de endpoints REST.
- `controllers/compilerController.js`: orquestación del flujo de compilación y parsing.
- `ll1-engine/llEngine.js`: motor formal LL(1).
- `ll1-engine/lexer.js`: tokenizador de cadenas de entrada.
- `ll1-engine/parser.js`: parser predictivo descendente basado en tabla.
- `jison/wison.jison`: gramática meta de Wison y generador de AST.

### 2.4 Flujo de alto nivel

1. Usuario redacta gramática Wison en frontend.
2. Frontend invoca `POST /api/compile`.
3. Backend parsea Wison con Jison y obtiene AST.
4. `LLEngine` analiza la gramática y produce PRIMERO, SIGUIENTE y tabla LL(1).
5. Frontend conserva gramática y tabla de símbolos en estado local.
6. Usuario ingresa cadena de prueba.
7. Frontend invoca `POST /api/parse`.
8. Backend tokeniza con `Lexer`, analiza con `ParserLL1` y devuelve aceptación/rechazo y árbol de derivación.

## 3. Lógica Core: Motor LL(1)

## 3.1 Entrada estructural del motor

La entrada del motor es el AST generado por Jison desde `wison.jison`. Del AST se extraen:

- Terminales (`ast.terminals`)
- No terminales (`ast.nonTerminals`)
- Producciones (`ast.productions`)
- Símbolo inicial (`ast.initialSymbol`)

`LLEngine` normaliza producciones a una forma uniforme:

`A -> α` con índice interno y versión textual para trazabilidad.

## 3.2 Cálculo de conjuntos PRIMERO

El motor aplica un algoritmo de punto fijo:

1. Inicializa PRIMERO de terminales con el terminal mismo.
2. Inicializa PRIMERO de no terminales como vacío.
3. Recorre producciones iterativamente hasta convergencia.
4. Para cada `A -> Y1 Y2 ... Yk`, aplica propagación de símbolos:
   - Agrega `PRIMERO(Y1) - {EPSILON}`
   - Si `EPSILON ∈ PRIMERO(Y1)`, continúa con `Y2`
   - Si todos derivan epsilon, agrega `EPSILON`

Este comportamiento está implementado por:

- `calcularPrimeros()`
- `calcularPrimeroDeCadena(cadena)`

## 3.3 Cálculo de conjuntos SIGUIENTE

También se utiliza punto fijo con reglas clásicas:

1. `$` se agrega al SIGUIENTE del símbolo inicial.
2. Para `A -> α B β`, se agrega `PRIMERO(β) - {EPSILON}` a `SIGUIENTE(B)`.
3. Si `β` deriva epsilon o es vacío, se agrega `SIGUIENTE(A)` a `SIGUIENTE(B)`.

Implementación principal:

- `calcularSiguientes()`

## 3.4 Construcción de tabla LL(1)

Para cada producción `A -> α`:

1. Para cada terminal `a` en `PRIMERO(α)` sin epsilon, insertar producción en `M[A, a]`.
2. Si `EPSILON ∈ PRIMERO(α)`, para cada `b` en `SIGUIENTE(A)`, insertar en `M[A, b]`.

Implementación principal:

- `construirTabla()`
- `agregarATabla(noTerminal, terminal, produccion, conflictos)`

## 3.5 Detección de colisiones LL(1)

Si una celda `M[A, a]` ya contiene una producción distinta y se intenta insertar otra, el motor reporta **colisión LL(1)**. Esta condición refleja:

- ambigüedad,
- recursividad por la izquierda,
- o necesidad de factorización.

Los conflictos se almacenan con:

- celda afectada,
- producción existente,
- producción nueva,
- sugerencia de corrección.

## 3.6 Parsing predictivo descendente

`ParserLL1` ejecuta el algoritmo clásico con pila:

1. Inicializa pila con `$` y símbolo inicial.
2. Compara tope de pila con token actual.
3. Si el tope es terminal:
   - coincide: consume token;
   - no coincide: error sintáctico.
4. Si el tope es no terminal:
   - consulta `M[X, a]`;
   - aplica producción y apila lado derecho en orden inverso.
5. Acepta cuando pila e entrada terminan en `$`.

El parser registra historial de pasos y construye árbol de derivación durante el proceso.

Métodos clave:

- `analizar(tokens)`
- `buscarEnTabla(noTerminal, terminal)`
- `obtenerEsperados(noTerminal)`
- `limpiarArbol(nodo)`

## 3.7 Tokenización de cadenas de prueba

`Lexer` convierte cadenas de entrada en tokens de terminales definidos por el usuario:

- compilación de expresiones regulares desde el AST;
- prioridad para patrones estáticos sobre patrones genéricos;
- regla de match más largo;
- ignorado seguro de espacios en blanco (`\s+`);
- reporte de error léxico con línea y columna.

Métodos clave:

- `compilarPatrones()`
- `esPatronEstatico(expr)`
- `expresionARegex(expr)`
- `tokenizar(entrada)`

## 4. Procedimiento para construir gramáticas en Wison

Este apartado documenta el procedimiento formal de construcción de gramáticas en el lenguaje Wison.

## 4.1 Estructura general de archivo

```wison
Wison ¿
Lex {:
  # Declaraciones de terminales
:}

Syntax {{:
  # Declaraciones de no terminales
  # Símbolo inicial
  # Producciones
:}}

?Wison
```

## 4.2 Bloque Lex

Función: definir el conjunto de terminales y su reconocimiento léxico.

Formato:

```wison
Terminal $_NOMBRE <- EXPRESION ;
```

Reglas relevantes:

- Nombres de terminales inician con `$_`.
- Literales y palabras reservadas entre comillas simples.
- Rangos admitidos: `[aA-zZ]` y `[0-9]`.
- Operadores unarios: `*`, `+`, `?`.
- Concatenación por secuencia y agrupación con paréntesis.

Ejemplos:

```wison
Terminal $_ID <- [aA-zZ]+;
Terminal $_NUM <- [0-9]+;
Terminal $_MAS <- '+';
Terminal $_FIN <- 'FIN';
```

## 4.3 Bloque Syntax

Función: declarar no terminales, símbolo inicial y producciones.

Declaración de no terminal:

```wison
No_Terminal %_E ;
```

Símbolo inicial:

```wison
Initial_Sim %_E ;
```

Producciones:

```wison
%_E <= %_T %_E_PRIMA ;
%_E_PRIMA <= $_MAS %_T %_E_PRIMA | ;
```

Reglas semánticas de validación:

- Todo no terminal debe declararse antes de su uso.
- Debe existir símbolo inicial.
- Deben existir producciones para el símbolo inicial.
- Gramáticas no LL(1) generan colisiones en la tabla.

## 4.4 Recomendaciones de diseño LL(1)

Para garantizar compatibilidad con análisis LL(1):

1. Evitar recursividad por la izquierda.
2. Aplicar factorización por la izquierda cuando sea necesario.
3. Definir terminales no ambiguos.
4. Verificar colisiones en la tabla LL(1) tras cada compilación.

## 5. Explicación de gramáticas utilizadas

## 5.1 Ejemplo 1: Gramática de oraciones simples (sujeto + verbo + emoji textual)

### 5.1.1 Definición propuesta

```wison
Wison ¿
Lex {:
  Terminal $_SUJETO <- 'YO' | 'TU' | 'ELLA';
  Terminal $_VERBO <- 'SALUDO' | 'OBSERVO' | 'ESCRIBO';
  Terminal $_EMOJI <- 'EMOJI_FELIZ' | 'EMOJI_TRISTE';
:}

Syntax {{:
  No_Terminal %_ORACION;
  Initial_Sim %_ORACION;

  %_ORACION <= $_SUJETO $_VERBO $_EMOJI;
:}}
?Wison
```

### 5.1.2 Funcionamiento interno

1. El lexer reconoce tres categorías terminales (`$_SUJETO`, `$_VERBO`, `$_EMOJI`).
2. El parser exige una secuencia estricta de tres tokens.
3. PRIMERO(`%_ORACION`) = `{$_SUJETO}`.
4. SIGUIENTE(`%_ORACION`) = `{$}`.
5. La tabla LL(1) tiene una sola producción para la fila `%_ORACION`.

### 5.1.3 Interpretación de resultados

- Cadena aceptada: `YO SALUDO EMOJI_FELIZ`.
- Cadena rechazada: `SALUDO YO EMOJI_FELIZ` (orden inválido).

## 5.2 Ejemplo 2: Calculadora aritmética básica LL(1)

### 5.2.1 Definición de referencia (factorizada)

```wison
Wison ¿
Lex {:
  Terminal $_NUM <- [0-9]+;
  Terminal $_MAS <- '+';
  Terminal $_POR <- '*';
  Terminal $_PAREN_IZQ <- '(';
  Terminal $_PAREN_DER <- ')';
  Terminal $_ID <- [aA-zZ]+;
:}

Syntax {{:
  No_Terminal %_E;
  No_Terminal %_E_PRIMA;
  No_Terminal %_T;
  No_Terminal %_T_PRIMA;
  No_Terminal %_F;

  Initial_Sim %_E;

  %_E <= %_T %_E_PRIMA;
  %_E_PRIMA <= $_MAS %_T %_E_PRIMA | ;
  %_T <= %_F %_T_PRIMA;
  %_T_PRIMA <= $_POR %_F %_T_PRIMA | ;
  %_F <= $_PAREN_IZQ %_E $_PAREN_DER | $_ID | $_NUM;
:}}
?Wison
```

### 5.2.2 Funcionamiento interno

1. `%_E` modela suma; `%_T` modela multiplicación; `%_F` modela operandos y paréntesis.
2. `%_E_PRIMA` y `%_T_PRIMA` eliminan recursividad por la izquierda.
3. PRIMERO y SIGUIENTE se propagan por no terminales auxiliares.
4. La tabla LL(1) queda libre de colisiones si la gramática está correctamente factorizada.

### 5.2.3 Interpretación de resultados

- Entrada aceptada: `a + 3 * b`.
- Entrada rechazada: `+ a 3` (error sintáctico por token inesperado).

## 6. Endpoints y contrato de integración

## 6.1 `POST /api/compile`

Entrada:

```json
{
  "code": "string",
  "filename": "opcional",
  "skipLL1": false
}
```

Salida principal:

- AST de Wison.
- resumen de gramática.
- resultados LL(1): conjuntos, tabla, conflictos.

## 6.2 `POST /api/parse`

Entrada:

```json
{
  "code": "string",
  "input": "string"
}
```

Salida:

- estado de aceptación,
- historial de parsing,
- árbol de derivación (si acepta),
- detalle de errores (si rechaza).

## 7. Consideraciones de calidad técnica

1. El backend separa parsing de Wison, análisis LL(1), tokenización y parsing de cadenas.
2. El frontend desacopla vista y estado global mediante stores reactivos.
3. El historial de gramáticas utiliza persistencia local (`localStorage`) con operación explícita de limpieza.
4. La visualización del árbol mantiene navegación interactiva (zoom y desplazamiento) para mejorar interpretabilidad.

## 8. Mi conclusion tecnica es:

WisonCompiler_EH consolida una implementación integral de teoría de compiladores en un entorno web moderno. La solución articula correctamente las capas de análisis léxico, sintáctico y predictivo LL(1), a la vez que proporciona trazabilidad operativa y visualización útil para validación académica y demostración funcional.
