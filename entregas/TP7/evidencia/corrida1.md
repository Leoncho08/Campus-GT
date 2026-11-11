# Corrida 1 – revisor v1 (el del TP6)

## 1. mi-backlog/js/storage.js

**[Alto] js/storage.js:11 — Los elementos del array cargado no se validan**
Escenario: en `localStorage['mi-backlog:titulos']` hay `[null]`, o `[{"titulo":"x"}]` sin `fechaCreacion`. Eso pasa si alguien edita el dato a mano, si lo dejó una versión anterior de la app o si lo escribió otra página que comparte el mismo origen (con `file://`, Chrome comparte un solo localStorage entre todas las páginas locales). `cargarTitulos` solo revisa `Array.isArray` y devuelve el array tal cual. Después `app.js:160` lo asigna y `app.js:172` llama a `actualizarVista`. Ahí `ui.renderLista` llama a `filtrarYOrdenar`. Con `null`, `filtros.js:17` intenta leer `titulo.titulo` y tira TypeError. Sin `fechaCreacion`, el orden por defecto, `filtros.js:28`, ejecuta `undefined.localeCompare` y también tira TypeError. La lista y las estadísticas no se dibujan nunca. Cada alta, edición o cambio de filtro vuelve a pasar por `actualizarVista` y vuelve a fallar. Antes de fallar, `guardarTitulos` vuelve a escribir el dato roto. La app queda inutilizable de forma permanente hasta que alguien borre el localStorage a mano. El import sí filtra con `validation.esRegistroImportable` (`app.js:136`), pero la carga desde storage no aplica ese chequeo.

**[Medio] js/storage.js:21 — El aviso de error al guardar queda tapado por el de éxito**
Escenario: el `setItem` falla, por ejemplo con QuotaExceededError al importar un JSON grande o con el almacenamiento bloqueado, y `guardarTitulos` devuelve `false`. En `eliminarTitulo` (`app.js:96-97`) y en `importar` (`app.js:149-150`), `guardarYActualizar` muestra el error y enseguida `mostrarAviso` lo pisa con "Título eliminado." o "Se importaron N títulos." (`ui.js:168` reemplaza el texto). El usuario ve que todo salió bien, pero los cambios existen solo en memoria. Al recargar, el título borrado reaparece y la biblioteca importada desaparece.

## 2. mi-backlog-api/Repositories/JsonTitulosRepository.cs

**[Crítico] JsonTitulosRepository.cs:13 — El candado solo protege dentro de un proceso**
Escenario: el `SemaphoreSlim` es de la instancia y en `Program.cs:10` se registra como singleton, así que dentro de un mismo proceso las altas no se pisan. Si dos procesos usan el mismo `titulos.json` (dos instancias de la API detrás de un balanceador, o una corriendo con `dotnet watch` y otra con `dotnet run`), cada uno lee la lista, agrega su título y la reescribe. El último en terminar `File.Move` (línea 71) borra el alta del otro. Además, los dos escriben el mismo `titulos.json.tmp` (línea 66) y pueden mezclar sus contenidos. A confirmar: depende de cómo se despliegue. No hay configuración de despliegue en el proyecto que lo descarte.

**[Alto] JsonTitulosRepository.cs:20-44 — Cualquiera puede agrandar el archivo sin límite, y cada pedido lo procesa entero con un único candado**
Escenario: `TitulosController` no tiene `[Authorize]`, y `Program.cs` no configura autenticación ni límite de pedidos. CORS (`Program.cs:15`) no frena a clientes que no son navegadores. Un script que manda `POST /api/titulos` en bucle, con comentarios de 500 caracteres, hace crecer el archivo sin tope. Cada POST deserializa y reescribe la lista completa (líneas 39-41). Cada GET, incluido `GET /api/titulos/{id}` (línea 29), carga todo el archivo en memoria. Todo pasa de a un pedido por vez por el mismo semáforo. Cuando el archivo llega a cientos de MB, los pedidos se encolan detrás del candado y la API deja de responder a todos. También puede quedarse sin memoria o llenar el disco.

**[Medio] JsonTitulosRepository.cs:67-71 — El reemplazo vía temporal no garantiza que los datos estén en disco**
Escenario: el temporal se cierra sin `Flush(true)` antes del `File.Move`. Si hay un corte de luz justo después del reemplazo, el sistema de archivos puede dejar `titulos.json` vacío o truncado. En el siguiente arranque, `LeerAsync` lanza `DatosCorruptosException` (línea 57) y todo GET y todo POST devuelve 500 hasta que alguien repare el archivo a mano.

**[Medio] JsonTitulosRepository.cs:52 — Un elemento `null` en el JSON tumba los listados**
Escenario: si el archivo contiene `[null, {...}]` (porque alguien lo editó a mano o copió datos desde el frontend), la deserialización no falla y la lista trae un `null`. `ObtenerPorIdAsync` lanza `NullReferenceException` en `t.Id` (línea 30), y `TitulosService.ListarAsync` (`TitulosService.cs:19`) también falla al leer `t.FechaCreacion`. Todos los GET devuelven 500 con el mensaje genérico, no con el de datos corruptos.

## 3. mi-backlog/js/app.js

**[Crítico] app.js:136 / 142 — La importación acepta ids repetidos y después editar o eliminar toca varios registros**
Escenario: se importa un JSON con dos registros válidos que tienen el mismo `"id": "abc"`. `esRegistroImportable` (validation.js:61-66) revisa cada registro por separado y nunca compara ids entre sí, así que los dos entran. Si el usuario elimina uno, `titulos.filter((t) => t.id !== id)` (línea 94) borra los dos. Si edita uno, el `map` de las líneas 55-56 pisa también el otro con los mismos datos. En los dos casos el cambio se guarda en localStorage y el segundo registro se pierde.

**[Alto] app.js:160 — Lo que viene de localStorage se usa sin validar, y un registro mal formado deja la app inutilizable en cada carga**
Escenario: localStorage tiene en `mi-backlog:titulos` el valor `[null]`, o `[{"titulo":"x"}]` sin `fechaCreacion`. `cargarTitulos` (storage.js:8-15) solo comprueba que sea un array. Cuando se llama a `actualizarVista()` (línea 172), el orden por defecto ejecuta `b.fechaCreacion.localeCompare(...)` (filtros.js:28) o `crearTarjeta` lee `titulo.id` sobre `null` (ui.js:90), y tira un TypeError. Pasa lo mismo cada vez que se recarga la página, en cada filtro y en cada alta, hasta que alguien borre el storage a mano. A confirmar: quién más puede escribir esa clave. La app corre desde `file://` y hay que revisar si el navegador comparte localStorage entre todos los archivos locales (Chrome lo hace). Si es así, cualquier otro HTML abierto con doble clic puede escribirla.

**[Medio] app.js:149-150 (y 96-97) — Si falla el guardado, el aviso de éxito tapa el error**
Escenario: la importación supera la cuota de localStorage y `setItem` tira una excepción. `guardarYActualizar` muestra "No se pudieron guardar los cambios" y en la línea siguiente `mostrarAviso` lo reemplaza por "Se importaron N títulos." El usuario ve que todo salió bien, pero los datos solo están en memoria. Al recargar vuelve la biblioteca anterior, y también se pierde todo lo que haya editado en esa sesión. Al eliminar pasa lo mismo: si el guardado falla, aparece "Título eliminado." y el título vuelve a aparecer al recargar.

**[Medio] app.js:122-131, 142-143 — La importación no limita el tamaño del archivo y conserva campos que no se piden**
Escenario: se elige un archivo JSON de cientos de MB. `readAsText` y `JSON.parse` corren completos en el hilo principal y la pestaña se congela. En otro caso, un archivo chico pero con registros que traen campos extra (por ejemplo `"x": "<5 MB de texto>"`) pasa la validación, porque solo se miran los campos conocidos. El `...registro` de la línea 143 copia esos campos al estado, y eso dispara el fallo de cuota del hallazgo anterior. `fechaActualizacion` tampoco se valida y puede quedar con cualquier tipo de dato.

**[Medio] app.js:118-119 — La URL del archivo exportado se revoca apenas se hace el click**
Escenario: `URL.revokeObjectURL` se ejecuta en la misma vuelta que `enlace.click()`. Hay navegadores que inician la descarga de forma asíncrona y no descargan nada o bajan un archivo vacío, y el usuario cree que tiene su respaldo. A confirmar: probar la exportación en Firefox y Safari.

## 4. mi-backlog/js/filtros.js

**[Alto] js/filtros.js:28 — Un registro sin `fechaCreacion`/`titulo` de tipo string en localStorage hace que la lista falle cada vez que se dibuja**
Escenario: `storage.cargarTitulos()` (storage.js:11) solo revisa que lo guardado bajo `mi-backlog:titulos` sea un array. No valida cada elemento. Si ese array tiene un elemento sin `fechaCreacion`, `b.fechaCreacion.localeCompare(...)` lanza un TypeError. Los casos posibles son: otra página `file://` que comparte el origen y escribe la misma clave, una edición manual o datos de una versión anterior. Esto pasa con el orden por defecto, porque `COMPARADORES.fecha` es el comparador de respaldo (línea 33). Con un elemento `null`, falla antes, en `titulo.titulo` (línea 17). Con `titulo` que no es string y el orden "nombre", falla en la línea 26. `ui.renderLista` (ui.js:134) ya llamó a `lista.replaceChildren()` antes de llamar a `filtrarYOrdenar`, y nada atrapa la excepción. Resultado: la lista queda vacía, `renderEstadisticas` no corre (app.js:26-27) y lo mismo se repite en cada búsqueda, filtro, alta o edición. La app queda inutilizable hasta que alguien borre el localStorage a mano. La importación no tiene este problema: `esRegistroImportable` (validation.js:61-66) exige `fechaCreacion` string y un `titulo` válido.

## 5. mi-backlog-api/Services/ReglasTitulo.cs

**[Medio] Services/ReglasTitulo.cs:20-23 — Un nombre hecho solo de caracteres invisibles pasa la validación**
Escenario: un POST /api/titulos con `"titulo": "​"` (espacio de ancho cero), `"‎"` o `"\u0000"`. `Trim()` solo saca los caracteres que `char.IsWhiteSpace` toma como espacio, y estos no entran en esa lista. Entonces `titulo.Length` da 1, la regla de "obligatorio" no se dispara y `TitulosService.CrearAsync` (TitulosService.cs:33) guarda un título que en pantalla queda vacío. Lo mismo pasa con `Plataforma` y `Comentario`, que no tienen ninguna restricción de caracteres.

**[Medio] Services/ReglasTitulo.cs:27, 30 — Tipo y Estado se comparan sin limpiar y byte a byte**
Escenario: un cliente manda `"tipo": "Juego "` o `" Pendiente"` (con un espacio de más), o `"Película"` con la tilde como carácter combinado (forma NFD, la que suele salir al copiar y pegar en macOS). `Genero` pasa por `Limpiar` antes de comparar (línea 33), pero `Tipo` y `Estado` se comparan con `Contains` tal cual llegan, sin `Trim` ni normalización Unicode. El pedido vuelve con 400 aunque el valor sea uno de los permitidos.
