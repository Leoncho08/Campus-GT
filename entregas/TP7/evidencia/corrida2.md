# Corrida 2 – revisor v2 (una línea cambiada)

## 1. mi-backlog/js/storage.js

**[Crítico] js/storage.js:12 — Si el JSON guardado está corrupto, se pisa en el siguiente guardado**
Escenario: el valor de `mi-backlog:titulos` no es un JSON válido (se cortó una escritura, alguien lo editó a mano desde DevTools, o lo escribió otra versión de la app). `cargarTitulos` atrapa el error y devuelve `[]` sin avisar. La app arranca con la biblioteca vacía (app.js:160). En cuanto el usuario agrega, edita o marca un favorito, `guardarYActualizar` (app.js:31) llama a `guardarTitulos` y el `setItem` reemplaza el texto original con la lista nueva. Todos los títulos que ya estaban guardados se pierden y no queda copia para recuperarlos. Lo mismo pasa si el valor es un JSON válido pero no es un array (línea 11).

**[Alto] js/storage.js:11 — Solo se chequea que sea un array, no lo que tiene adentro**
Escenario: en localStorage hay `[null]`, o un registro sin `titulo` o sin `fechaCreacion`. `cargarTitulos` lo devuelve tal cual porque `Array.isArray` da true. Ahí `ui.renderLista` usa filtros.js, que lee `titulo.titulo` sobre `null` (filtros.js:17) o hace `b.fechaCreacion.localeCompare(...)` (filtros.js:28) o `a.titulo.localeCompare(...)` (filtros.js:26) sobre `undefined`. Eso tira un TypeError dentro de `actualizarVista` en `iniciar` (app.js:172). La lista no se dibuja, y cada búsqueda o filtro vuelve a dar el mismo error. La app queda inutilizable hasta que alguien borre la clave a mano. El import sí revisa cada registro con `esRegistroImportable` (app.js:136). La carga desde storage no lo hace.

**[Medio] js/storage.js:19 — Cuando se llena la cuota, ningún cambio se guarda pero en pantalla sí aparecen**
Escenario: la biblioteca crece, o se importa un archivo grande, hasta pasar la cuota de localStorage (unos 5 MB por origen), o el navegador bloquea el storage. `setItem` falla y `guardarTitulos` devuelve `false`. app.js:31 muestra un aviso pero deja el cambio en memoria (`titulos`). Desde ese momento ningún alta, edición ni borrado llega a guardarse, aunque la pantalla los muestre. Al recargar, todo lo hecho desde la primera falla desaparece. En un import (app.js:142-149) la biblioteca de la pantalla ya fue reemplazada aunque no se haya podido guardar.

## 2. mi-backlog-api/Repositories/JsonTitulosRepository.cs

**[Crítico — A confirmar] JsonTitulosRepository.cs:13 — El candado solo vale dentro de un proceso**
Escenario: `_candado` es un `SemaphoreSlim` en memoria. El registro como singleton (Program.cs:10) lo hace compartido dentro de un proceso, pero no entre procesos. Si dos procesos usan el mismo `titulos.json` (dos instancias detrás de un balanceador, un reinicio con solapamiento, o `dotnet watch` corriendo junto a otra instancia), cada uno ejecuta `LeerAsync` → `Add` → `EscribirAsync` por su cuenta. El último `File.Move` reemplaza el archivo y se pierde el alta del otro proceso. A confirmar: cómo se despliega (cantidad de instancias, si comparten volumen). No hay archivos de despliegue en el repo.

**[Medio] JsonTitulosRepository.cs:67-71 — El temporal no se fuerza a disco antes del reemplazo**
Escenario: `SerializeAsync` escribe al `.tmp` y al cerrar el stream los datos quedan en la caché del sistema operativo, no necesariamente en el disco. `File.Move` reemplaza el original enseguida. Si se corta la luz o se cae el equipo después del rename y antes de que la caché llegue al disco, el archivo puede quedar vacío o truncado. En el siguiente arranque `LeerAsync` lanza `DatosCorruptosException` y la API devuelve 500 en todas las lecturas y altas. El original ya fue reemplazado, así que no queda copia buena. El comentario de las líneas 63-64 dice que esto está cubierto, pero no lo está para este caso.

**[Medio] JsonTitulosRepository.cs:23, 29, 39-41 — Cada operación lee o reescribe el archivo entero con un candado global**
Escenario: `ObtenerTodosAsync`, `ObtenerPorIdAsync` y `AgregarAsync` deserializan la biblioteca completa, y cada alta la vuelve a serializar entera. Todas pasan por el mismo `SemaphoreSlim`, así que GETs y POSTs se atienden de a uno. Un `GET /{id}` también carga el archivo completo. El tiempo de cada request crece con la cantidad de títulos, y con requests concurrentes se forma una cola en `WaitAsync()` (sin timeout ni cancelación). La latencia sube para todos los usuarios a medida que crece el archivo.

**[Medio] JsonTitulosRepository.cs:71 — El reemplazo falla si otro proceso tiene abierto el archivo**
Escenario: en Windows, si `titulos.json` está abierto por otro programa (antivirus escaneándolo, un editor, una herramienta de backup), `File.Move(..., overwrite: true)` lanza `IOException`/`UnauthorizedAccessException`. El alta no se guarda y el cliente recibe el 500 genérico "Ocurrió un error inesperado", sin saber si tiene que reintentar. Queda un `.tmp` con datos que nadie usa. Los datos que ya estaban guardados no se pierden.

## 3. mi-backlog/js/app.js

**[Crítico] app.js:136 — La importación acepta ids duplicados y después una acción afecta a varios registros**
Escenario: se importa un JSON con dos registros que tienen el mismo `"id"`, por ejemplo dos títulos distintos con `"id": "a1"`. `esRegistroImportable` (validation.js:61-66) valida cada registro por separado y nada controla que los ids sean únicos. Después de importar, "Eliminar" sobre uno de ellos ejecuta `titulos.filter((t) => t.id !== id)` (línea 94) y borra los dos. "Editar" sobre uno ejecuta el `map` de la línea 55, que sobrescribe los dos con los mismos datos. Las dos operaciones se guardan en localStorage y el otro título se pierde sin aviso.

**[Alto] app.js:160 — Lo que se carga de localStorage se usa sin validar y un registro mal formado deja la lista sin dibujarse**
Escenario: la clave `mi-backlog:titulos` contiene un array con un elemento `null`, o con un registro sin `fechaCreacion`, sin `titulo` o con alguno de esos campos sin ser texto. `storage.cargarTitulos` (storage.js:11) solo revisa que sea un array. `actualizarVista` llama a `filtrarYOrdenar`, donde `titulo.titulo` sobre `null` (filtros.js:17) o `b.fechaCreacion.localeCompare` con el orden por defecto (filtros.js:28) tiran TypeError. La lista y las estadísticas no se dibujan, y fallan también todas las acciones que redibujan después de guardar. Esto no se arregla recargando: el usuario tiene que borrar el localStorage a mano. Como la app se abre con doble clic (`file://`), en algunos navegadores otras páginas locales comparten ese localStorage y pueden escribir esa clave.

**[Medio] app.js:149-150 — El aviso de éxito tapa el error de guardado y el usuario pierde cambios al recargar**
Escenario: `localStorage.setItem` falla, por ejemplo por cuota llena o porque el navegador bloquea el almacenamiento. `guardarYActualizar` muestra "No se pudieron guardar los cambios", pero enseguida la línea 150 lo reemplaza por "Se importaron N títulos". Lo mismo pasa al eliminar, en la línea 97 ("Título eliminado."). En pantalla el cambio se ve aplicado. Al recargar vuelve el estado anterior: el título eliminado reaparece y la importación no existe.

**[Medio] app.js:142-146 — La importación guarda campos sin validar y sin límite de tamaño**
Escenario: se importa un archivo con registros válidos que además traen propiedades extra (por ejemplo un campo `"x"` de varios MB), una `plataforma` muy larga (validation.js no le pone tope, a diferencia de `titulo` y `comentario`) o un `fechaActualizacion` que no es texto (un objeto o un número). El `...registro` de la línea 143 copia todo eso tal cual y se guarda en localStorage. Con un archivo grande o con miles de registros se llena la cuota de unos 5 MB, el guardado falla y, por el hallazgo anterior, el usuario no se entera. Tampoco hay límite en la cantidad de registros: cada tecla en el buscador (línea 168) vuelve a filtrar, ordenar y dibujar todo el DOM de la lista, y la página se pone lenta.

## 4. mi-backlog/js/filtros.js

**[Alto] js/filtros.js:28 — El orden por fecha se rompe si algún registro guardado no tiene `fechaCreacion` de tipo string**
Escenario: `storage.cargarTitulos` (storage.js:10-11) solo verifica que lo leído de `localStorage` sea un array, sin revisar sus elementos. Basta que la clave `mi-backlog:titulos` tenga un elemento sin `fechaCreacion` de tipo string, por ejemplo `[{"titulo":"X"}]` o `[null]`. Eso pasa con un dato de una versión anterior, si alguien lo edita desde la consola, o si lo escribe otro archivo local, porque con `file://` varios navegadores comparten el origen entre archivos locales. En ese caso `b.fechaCreacion.localeCompare` lanza `TypeError`. Como "fecha" es el orden por defecto (línea 33), la falla aparece apenas carga la página. En `ui.renderLista` (ui.js:134-136) la lista ya se vació con `replaceChildren()` antes de llamar a `filtrarYOrdenar`, así que queda vacía. La excepción también corta `actualizarVista` antes de `renderEstadisticas` (app.js:26-27). Toda acción posterior (alta, edición, favorito, filtros) termina en el mismo error y la app deja de mostrar la biblioteca. Los datos sí se siguen guardando, porque `guardarTitulos` corre antes del render.

**[Medio] js/filtros.js:17 y js/filtros.js:26 — Buscar u ordenar por nombre falla con registros sin `titulo` de tipo string**
Escenario: es el mismo origen sin validar de `localStorage` (storage.js:11). Si un elemento es `null`, cualquier filtro activo (texto, tipo, estado, etc.) lanza `TypeError` al leer `titulo.titulo` en la línea 17. Si un elemento tiene `titulo` como número o no lo tiene, elegir el orden "nombre" lanza `TypeError` en `a.titulo.localeCompare` (línea 26). La búsqueda por texto no falla en ese caso porque `normalizarTexto` convierte a string. En los dos casos la lista queda vacía, como en el hallazgo anterior, pero solo mientras ese filtro u orden esté activo. Por el camino de importación no pasa: `esRegistroImportable` (validation.js:61-66) exige `titulo` válido y `fechaCreacion` string.

## 5. mi-backlog-api/Services/ReglasTitulo.cs

**[Medio] Services/ReglasTitulo.cs:27,30,34 — Tipo, estado y género se rechazan si llegan con otra normalización Unicode**
Escenario: un cliente manda `"tipo": "Película"` con la "í" descompuesta (NFD: `i` + U+0301, como suelen generarla macOS/iOS al pegar texto) o `"genero": "Acción"` en esa misma forma. `Contains` compara ordinal contra los literales en NFC, así que no hay coincidencia y la API responde 400 a un valor que el usuario ve idéntico al permitido. Afecta a "Película", "Acción" y "Ciencia ficción". `Tipo` y `Estado` además no pasan por `Limpiar`, así que `"Juego "` con un espacio al final también se rechaza.

**[Medio] Services/ReglasTitulo.cs:20-23 — Un título que se ve vacío pasa la validación de obligatorio**
Escenario: `"titulo": "​"` (espacio de ancho cero) o un carácter de control como `"\u0007"`. `Trim()` no los quita porque no son espacios en blanco Unicode, así que `Length` da 1 y la regla de obligatorio no salta. `TitulosService.CrearAsync` (TitulosService.cs:33) guarda ese valor como `Nombre` y el título queda en la lista sin nombre visible. Lo mismo pasa con `Plataforma` y `Comentario`, que tampoco filtran caracteres de control.
A confirmar: cómo muestra el frontend `Nombre` y `Comentario` (inserción como texto o como HTML). Esta clase no restringe el contenido, solo el largo.
