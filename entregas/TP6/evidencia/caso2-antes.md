## Revisión: `descuento.ts`

**Resumen:** este archivo no tiene hallazgos graves. Es una función pura, sin E/S y sin estado. Valida tipo, rango y finitud de las dos entradas antes de operar. Lo que sigue son casos borde de severidad baja.

### Las cuatro preguntas

1. **¿Qué entra sin validar?** Nada. `p` y `pct` se validan con `Number.isFinite`, que rechaza `NaN`, `Infinity` y también valores que no son número (por ejemplo `"100"` llegando desde JS sin tipar). Además se valida `p >= 0` y `0 <= pct <= 100`.
2. **¿Qué pasa si falla?** Lanza `RangeError` con un mensaje claro y no deja nada a medio hacer. El resto del sistema sobrevive siempre que quien la llama capture la excepción. Eso depende del código que la llama, no de este archivo.
3. **¿Qué se rompe con volumen?** Nada. Es O(1), sin memoria acumulada ni recursos compartidos.
4. **¿Quién la ejecuta y con qué permisos?** Cualquier código que la importe. No toca archivos, red ni datos sensibles, así que no requiere permisos.

### Hallazgos (de más grave a menos grave)

1. **Redondeo de punto flotante en montos (bajo).** `Math.round(r * 100) / 100` hereda los errores de representación binaria. Algunos valores que en decimal terminan exactamente en ,5 quedan apenas por debajo y se redondean hacia abajo (caso típico: `1.005` → `1`, no `1.01`). Si el resultado se usa como dinero facturable, puede haber diferencias de un centavo frente a lo esperado o frente a otro sistema que calcule en decimal.
2. **Desborde con precios extremadamente grandes (muy bajo).** `p` puede ser cualquier número finito. Con `p` cerca de `Number.MAX_VALUE`, `p * pct` o `r * 100` desbordan a `Infinity`, y la función devuelve `-Infinity` o `Infinity` en lugar de lanzar error. Hacen falta valores del orden de 1e306, imposibles en un precio real, pero el contrato de "siempre devuelve un precio válido o lanza" se rompe en ese extremo.

No encontré nada más que valga la pena reportar.
