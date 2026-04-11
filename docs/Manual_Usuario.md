# UNIVERSIDAD DE SAN CARLOS DE GUATEMALA

## CENTRO UNIVERSITARIO DE OCCIDENTE

### DIVISIÓN DE CIENCIAS DE LA INGENIERÍA

### ORGANIZACIÓN DE LENGUAJES Y COMPILADORES 1 - SEMESTRE 1 2026

---

# PRÁCTICA 2: GENERADOR LL(1) CON WISON

## MANUAL DE USUARIO

## WisonCompiler_EH

**Nombre:** Enrique Hernandez
**Carnet:** 202230026

---

## 1. Introducción

WisonCompiler_EH es una aplicación web para crear, compilar y probar gramáticas LL(1) en lenguaje Wison. La interfaz está organizada en tres pestañas: **Inicio**, **Editor** y **Gramaticas**, facilitando un flujo guiado desde la definición de la gramática hasta la validación de cadenas de entrada.

## 2. Requisitos del sistema

## 2.1 Requisitos de ejecución

- Navegador web moderno (Chrome, Edge, Firefox o equivalente).
- Backend y frontend ejecutándose localmente.

## 2.2 Ejecución previa del proyecto

1. Abrir una terminal para backend:

```bash
cd backend
npm install
npm run dev
```

2. Abrir una terminal para frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Abrir en navegador la URL entregada por Vite (comúnmente `http://localhost:5173`).

## 3. Guía de uso paso a paso

## 3.1 Pestaña Inicio

La pestaña Inicio presenta:

- descripción funcional de WisonCompiler_EH,
- objetivos de la herramienta,
- características principales,
- flujo básico recomendado de uso.

Su objetivo es contextualizar al usuario antes de iniciar edición o pruebas.

## 3.2 Pestaña Editor

La pestaña Editor es el punto de creación y compilación de gramáticas.

### 3.2.1 Escribir código Wison

1. Ubique el área del Monaco Editor.
2. Escriba o pegue la gramática Wison completa (`Wison ¿ ... ?Wison`).
3. Use sintaxis válida para bloques `Lex` y `Syntax`.

### 3.2.2 Nombrar la gramática

1. En la barra superior, utilice el campo:
   - **"Nombre de la gramatica"**.
2. Ingrese un identificador descriptivo para guardar la gramática.
3. Si queda vacío, el sistema asigna:
   - **"Gramatica Sin Nombre"**.

### 3.2.3 Cargar archivo `.wison`

1. Presione **"Cargar Archivo .wison"**.
2. Seleccione el archivo local.
3. El contenido se cargará automáticamente en el editor.

### 3.2.4 Compilar gramática

1. Presione **"Compilar Gramatica"**.
2. El sistema envía el contenido al backend (`POST /api/compile`).
3. Revise la consola:
   - mensajes de compilación exitosa,
   - errores léxicos/sintácticos con línea y columna.

### 3.2.5 Resultado de compilación

Cuando la compilación es exitosa:

- se actualiza la gramática activa;
- se genera y almacena la tabla de símbolos (terminales/no terminales);
- se guarda la gramática en el historial local para reutilización en la pestaña Gramaticas.

## 3.3 Pestaña Gramaticas

Esta pestaña permite ejecutar pruebas de cadenas y visualizar árboles de derivación.

### 3.3.1 Seleccionar gramática guardada

1. En el panel izquierdo **"Gramaticas Generadas"**, ubique la gramática deseada.
2. Presione **"Aplicar"**.
3. El sistema carga:
   - código Wison activo;
   - tabla de símbolos asociada.

### 3.3.2 Revisar gramática activa y tabla de símbolos

En la zona superior derecha:

- el primer `textarea` muestra la gramática activa;
- el segundo `textarea` recibe la cadena de entrada;
- la sección **"Tabla de Simbolos"** muestra columnas:
  - **Simbolo**
  - **Tipo**

La tabla posee scroll interno para manejar volúmenes altos de símbolos.

### 3.3.3 Evaluar cadena de entrada

1. Ingrese la cadena en **"Cadena de Entrada a evaluar"**.
2. Presione **"Probar Entrada"**.
3. El sistema ejecuta:
   - tokenización de entrada;
   - parsing LL(1) predictivo;
   - reporte de aceptación o rechazo.

### 3.3.4 Interpretar resultados

Panel de estado:

- **Cadena Aceptada:** la entrada cumple la gramática.
- **Cadena Rechazada/Error:** se muestran mensajes y detalle del problema detectado.

### 3.3.5 Navegar el árbol de derivación (D3.js)

Cuando la cadena es aceptada:

- se renderiza el árbol de derivación en la zona inferior;
- puede usar zoom con rueda del mouse;
- puede desplazarse arrastrando para inspeccionar nodos.

### 3.3.6 Limpiar historial de gramáticas

1. En el panel izquierdo, presione **"Limpiar Historial"**.
2. El sistema elimina:
   - lista reactiva de gramáticas guardadas,
   - persistencia en `localStorage` (`wison_grammars`).
3. El panel vuelve al estado vacío.

## 4. Buenas prácticas de uso

1. Verifique siempre la compilación antes de probar cadenas.
2. Nombre cada gramática para facilitar identificación en el historial.
3. Mantenga separadas gramáticas de prueba por dominio (aritmética, lenguaje natural, etc.).
4. Limpie historial cuando quiera reiniciar entorno de pruebas.

## 5. Solución de problemas comunes

## 5.1 Error de conexión con backend

Síntoma:

- mensaje de red en consola del Editor.

Acciones:

1. Confirmar backend activo en puerto 3000.
2. Confirmar que frontend esté apuntando a `http://localhost:3000/api`.

## 5.2 Gramática rechazada como no LL(1)

Síntoma:

- reporte de colisiones en tabla LL(1).

Acciones:

1. Eliminar recursividad por la izquierda.
2. Aplicar factorización por la izquierda.
3. Volver a compilar y revisar conflictos reportados.

## 5.3 Cadena rechazada en parseo

Síntoma:

- error sintáctico en pestaña Gramaticas.

Acciones:

1. Verificar orden de tokens en la cadena.
2. Revisar que los terminales usados existan en el bloque Lex.
3. Confirmar que la cadena cumpla producciones de la gramática activa.

## mi conclusion es:

WisonCompiler_EH proporciona un entorno completo para aprendizaje y validación práctica de gramáticas LL(1). Este manual describe el recorrido operativo recomendado para redactar gramáticas, compilarlas, analizarlas y depurar entradas de forma estructurada y reproducible.
