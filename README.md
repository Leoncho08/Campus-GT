# Mi Backlog – Generación T

Biblioteca personal de juegos, series y películas: cada título tiene estado (pendiente, en curso, terminado, abandonado), puntaje, comentario y favoritos, con búsqueda, filtros y exportación/importación en JSON.

El proyecto se fue construyendo a lo largo de los trabajos prácticos del curso. Hay un commit por entrega.

## Estructura

```
mi-backlog/        Frontend: HTML, CSS y JavaScript sin librerías (datos en localStorage)
mi-backlog-api/    Backend: ASP.NET Core (.NET 10), Controller → Service → Repository
entregas/          Documentos de cada TP (Markdown y PDF) y su evidencia
```

## Entregas

| Entrega | Qué se hizo | Documento |
|---|---|---|
| TP1 – Diseñá tu propia aplicación | Problema, funcionalidades, datos, SPEC, prompt y challenge de validación | [TP1 - Mi Backlog.md](TP1%20-%20Mi%20Backlog.md) |
| Clase 10 – Refactoring + tests | Se separó la búsqueda/filtros/orden en `filtros.js` y se agregaron 18 tests unitarios | [entregas/Clase 10](entregas/Clase%2010/Clase%2010%20-%20Refactoring%20+%20Tests.md) |
| TP4 – Diseñando el backend | Análisis del frontend, endpoints, arquitectura y alta de títulos implementada | [entregas/TP4](entregas/TP4/TP4%20-%20Diseño%20del%20backend.md) |
| TP5 – Analizar antes de pedir | Tres problemas de `queryTicketRows`, prompt y justificación | [entregas/TP5](entregas/TP5/TP5%20-%20Analizar%20antes%20de%20pedir.md) |
| TP6 – Mejorá el agente | Revisor de código mejorado, con evidencia antes/después | [entregas/TP6](entregas/TP6/TP6%20-%20Mejorá%20el%20agente.md) |
| TP7 – Medí tu revisor | Medición del revisor: 3/5 → 4/5 cambiando una línea | [entregas/TP7](entregas/TP7/TP7%20-%20Medí%20tu%20revisor.md) |

## Cómo correrlo

**Frontend:** abrir `mi-backlog/index.html` con doble clic.

**Tests del frontend:** abrir `mi-backlog/tests/tests.html`. La pestaña muestra `PASS 18/18`.

**Backend** (requiere .NET 10):

```
cd mi-backlog-api
dotnet run
```

La API queda en `http://localhost:5080/api/titulos`. Con la API corriendo, para probarla:

```
powershell -ExecutionPolicy Bypass -File probar-api.ps1
```
