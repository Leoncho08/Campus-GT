## Revisión: `queryTicketRows.ts`

**Contexto:** se ejecuta en cada `GET /tickets`. Cada request lanza un proceso `sqlcmd` que trae la tabla `Tickets` completa como JSON.

### Las cuatro preguntas

1. **¿Qué datos entran desde afuera sin validarse?** Las variables `DB_SERVER` y `DB_DATABASE`, que vienen del `.env`, y el `stdout` de `sqlcmd`. Ese `stdout` se toma como JSON válido y se devuelve como `unknown[]` sin revisar qué forma tiene. El request HTTP no le pasa datos a esta función, así que no hay inyección SQL. `execFile` no usa shell, así que tampoco hay inyección de comandos.
2. **¿Qué pasa si esto falla?** No hay timeout, `sqlcmd` no se llama con `-b` y el error que se lanza puede llevar detalles del entorno. Si la base se cuelga, se acumulan procesos y requests. Si la base devuelve un error, aparece como un JSON inválido.
3. **¿Qué se rompe cuando crece el volumen?** No hay paginación, hay un tope fijo de 10 MB y se crea un proceso por request. Además, el JSON de SQL Server llega partido en varias filas.
4. **¿Quién lo ejecuta y con qué permisos?** Se ejecuta con la identidad de Windows del proceso Node (`-E`) y sin filtrar por usuario ni por columnas. El ejecutable `sqlcmd` se busca en el PATH.

### Hallazgos (de más grave a menos grave)

1. **El endpoint se cae entero cuando la tabla crece (líneas 9–10, 26–30, 38).** SQL Server devuelve el resultado de `FOR JSON` partido en varias filas de unos 2 KB cada una. Con `-h -1`, `sqlcmd` imprime cada fila en su propia línea. Si un corte cae dentro de un string, queda un salto de línea dentro del JSON y `JSON.parse` falla. Cuando la tabla pasa de un par de KB, el endpoint puede empezar a fallar de forma intermitente según los datos. Además, `SELECT *` sin `TOP` ni paginación tiene un techo fijo: cuando la salida pasa de 10 MB, `execFile` corta con un error de `maxBuffer` y `GET /tickets` deja de responder para todos. Mientras tanto, cada request carga la tabla entera en memoria.

2. **Sin timeout y con un proceso por request (líneas 20–31).** `execFile` no tiene `timeout` ni `killSignal`, y `sqlcmd` no tiene límite de tiempo por consulta. Si la base está lenta o hay bloqueos sobre `Tickets`, cada `GET` deja un proceso colgado sin fecha de fin. Con tráfico concurrente se acumulan procesos, memoria y conexiones hasta degradar el backend entero. No hace falta un ataque: alcanza con una base lenta y gente recargando la página.

3. **Los errores de SQL aparecen como JSON inválido (líneas 20–40).** Sin `-b`, `sqlcmd` sale con código 0 aunque falle la consulta: tabla inexistente, permiso denegado, base equivocada. El mensaje de error llega por `stdout`, no está vacío y termina en un `SyntaxError` de `JSON.parse` que oculta la causa real. Cuando el que falla es `execFile`, el error que se lanza incluye la línea de comando completa y lo que haya en `stderr`, con el servidor y la base. Si el handler de `GET /tickets` reenvía `err.message` al cliente, eso queda expuesto.

4. **Permisos amplios y exposición total de datos (líneas 25, 28).** `-E` conecta con la cuenta de Windows que corre Node, así que la consulta tiene todos los permisos SQL de esa cuenta. En desarrollo suele ser un usuario administrador. `SELECT *` devuelve todas las columnas de todos los tickets, incluidas las que se agreguen en el futuro, como datos personales o notas internas. La función no sabe quién la llama, así que cualquiera que llegue a `GET /tickets` ve todo. Hay que revisar si la ruta está protegida, porque este archivo no lo hace. Además, `sqlcmd` se busca por PATH. En Windows también se busca en el directorio actual, así que un `sqlcmd.exe` puesto ahí se ejecutaría con esa identidad.

5. **La configuración se valida a medias (líneas 6, 13–18, 24).** Solo se valida `DB_SERVER`. Si `DB_DATABASE` está vacío, se pasa `-d ""` y `sqlcmd` usa la base por defecto del login, que puede tener otra tabla `Tickets` o ninguna. El `.env` se busca con una ruta relativa a `__dirname`, que cambia cuando el código se compila a otra carpeta. En ese caso falla en silencio y se usan las variables que haya en el entorno.
