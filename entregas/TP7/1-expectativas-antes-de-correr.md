# TP7 – Expectativas (escritas ANTES de correr el revisor)

Revisor medido: `entregas/TP6/revisor.md` (la versión mejorada del TP6).

## Criterio de acierto (definido antes)

- **Archivo con problema:** acierta si el problema esperado aparece entre sus hallazgos, con cualquier severidad. Si encuentra otras cosas pero no esa, **no acierta**.
- **Archivo sano:** acierta si responde "Sin hallazgos". Si reporta algo, lo verifico en el código:
  - si es real, cuenta como acierto y lo anoto como un problema que yo no conocía;
  - si es inventado o exagerado, **no acierta**.

## Tabla

| # | Archivo | Tipo | Qué espero que encuentre |
|---|---|---|---|
| 1 | `mi-backlog/js/storage.js` | Con problema | Si el `localStorage` tiene datos corruptos, `cargarTitulos` devuelve `[]` sin avisar. El siguiente guardado (agregar un título, por ejemplo) **sobrescribe y borra toda la biblioteca**. |
| 2 | `mi-backlog-api/Repositories/JsonTitulosRepository.cs` | Con problema | El candado (`SemaphoreSlim`) solo protege dentro de **un** proceso. Si corren dos instancias de la API sobre el mismo archivo, dos altas simultáneas se pisan y **se pierde una**. Además, cada alta lee y reescribe el archivo entero. |
| 3 | `mi-backlog/js/app.js` | Con problema | `importar` valida cada registro, pero **no controla ids repetidos**. Con un archivo que tenga dos títulos con el mismo `id`, editar, marcar favorito o eliminar uno **afecta a los dos**. |
| 4 | `mi-backlog/js/filtros.js` | Sano | Nada. Son funciones puras con 18 tests. |
| 5 | `mi-backlog-api/Services/ReglasTitulo.cs` | Sano | Nada. Valida todos los campos con límites. |
