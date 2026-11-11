## Revisión: `repo/tickets.ts`

Para tener contexto también leí `routes/tickets.ts` (el único que llama a esta función) y `db.ts`.

### Las cuatro preguntas

1. **¿Qué datos entran desde afuera sin validarse?** El `id` se mete directo en el texto del SQL (línea 6). El archivo no lo valida: confía en que quien lo llama le pase un `number`. Hoy la ruta sí lo valida (`Number.isInteger(id) && id > 0`), así que por ese camino no se puede inyectar. Pero esa protección depende del llamador, no de este archivo.
2. **¿Qué pasa si falla?** La función no maneja errores. Si se cae la conexión, hay un timeout o la query falla, el error se propaga como promesa rechazada. La ruta tampoco lo atrapa.
3. **¿Qué se rompe con volumen?** Cada `id` distinto genera un texto de SQL distinto. SQL Server no reutiliza el plan de ejecución y va llenando la caché de planes con planes de un solo uso.
4. **¿Quién lo ejecuta y con qué permisos?** Corre con el usuario de base `DB_USER`, el mismo para todo el sistema. La función devuelve cualquier ticket por `id`, sin chequear si el pedido tiene derecho a verlo.

### Hallazgos (de más grave a menos grave)

1. **El SQL se arma interpolando el valor, y la seguridad depende de que valide otro archivo.** Línea 6: `` `... WHERE Id = ${id}` ``. El tipo `id: number` de TypeScript no existe en tiempo de ejecución. Si mañana alguien llama a `getTicketById` desde otro lugar (otra ruta, un job, un parámetro de query sin convertir) sin repetir la validación, queda abierta una inyección SQL con los permisos de `DB_USER`. Hoy no se puede explotar por `GET /tickets/:id` gracias a la validación de la ruta, pero la capa de datos no se defiende sola.

2. **Usa el pool sin esperar a que se conecte.** `db.ts` exporta `poolConectado = pool.connect()`, pero acá se llama `pool.request()` sin esperar esa promesa. Si llega un pedido apenas arranca el proceso, o después de que la conexión inicial falló, la query tira "connection not open". Si `pool.connect()` falla al inicio, nadie atrapa ese rechazo: la promesa queda rechazada sin manejo y, según la versión de Node, puede tirar abajo el proceso.

3. **Los errores de base no se manejan y el sistema no se recupera solo.** Ni la función ni la ruta atrapan excepciones. En Express 4, un `async` handler que rechaza deja el pedido colgado hasta el timeout del cliente, en vez de devolver un 500. En Node moderno, una promesa rechazada sin manejo puede terminar el proceso. Una caída momentánea de la base se convierte en una caída del servicio.

4. **No hay control de acceso por ticket.** La función devuelve el ticket con solo conocer el `id`, y los ids son enteros consecutivos, fáciles de recorrer. Cualquiera que llegue a la ruta puede enumerar todos los tickets (IDOR). Además, todo corre con una única credencial `DB_USER`. Si ese usuario tiene más permisos que `SELECT` sobre `Tickets`, cualquier falla del punto 1 tiene un alcance mayor.

5. **Contamina la caché de planes con volumen alto.** Al no usar parámetros, cada `id` es una query distinta para SQL Server. Con mucho tráfico eso significa más compilaciones, más CPU y planes útiles desplazados de la caché. Si la base no tiene activado `optimize for ad hoc workloads` o parametrización forzada, se nota cuando crece el volumen.
