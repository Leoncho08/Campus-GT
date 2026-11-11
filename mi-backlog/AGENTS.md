# AGENTS.md – Mi Backlog

Guía para agentes de IA que trabajen en este proyecto. La SPEC completa está en `../TP1 - Mi Backlog.md`.

## Qué es
App web para llevar una biblioteca personal de juegos, series y películas (estado, puntaje, comentario, favoritos).

## Tecnología y reglas
- HTML, CSS y JavaScript puro. **Sin frameworks ni librerías.**
- Tiene que funcionar abriendo `index.html` con doble clic (sin servidor). Por eso **no se usan módulos ES**: cada archivo es un script clásico que se registra en el objeto global `window.MiBacklog`.
- Datos en `localStorage` (clave `mi-backlog:titulos`).
- Interfaz y nombres de código en español.
- Nunca usar `innerHTML` con datos del usuario: usar `textContent` / `createElement`.

## Estructura
```
index.html
css/styles.css
js/validation.js   reglas y valores permitidos (TIPOS, ESTADOS, GENEROS)
js/storage.js      leer/guardar en localStorage
js/filtros.js      búsqueda, filtros y orden (funciones puras, sin DOM)
js/ui.js           todo lo que toca el DOM
js/app.js          estado de la app y eventos
tests/tests.html   abrir en el navegador para correr los tests
```

## Tests
- Abrir `tests/tests.html` en el navegador. El título de la pestaña muestra `PASS n/n` o `FAIL n/n`.
- La lógica nueva va en funciones puras (sin DOM) y con tests en `tests/`.

## Al hacer cambios
- Cambios chicos y de a una funcionalidad por vez.
- Un refactor no cambia el comportamiento: correr los tests antes y después.
