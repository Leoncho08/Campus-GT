// Mini runner de tests sin librerías: test(), afirmar e igualdad profunda.
(function () {
  'use strict';

  const resultados = [];

  function test(nombre, categoria, fn) {
    try {
      fn();
      resultados.push({ nombre, categoria, ok: true });
    } catch (error) {
      resultados.push({ nombre, categoria, ok: false, mensaje: error.message });
    }
  }

  function igual(obtenido, esperado, mensaje) {
    const a = JSON.stringify(obtenido);
    const b = JSON.stringify(esperado);
    if (a !== b) throw new Error(`${mensaje || 'No coincide'}\n  esperado: ${b}\n  obtenido: ${a}`);
  }

  function noLanzaError(fn) {
    try {
      return fn();
    } catch (error) {
      throw new Error('Lanzó un error inesperado: ' + error.message);
    }
  }

  function mostrarResultados() {
    const contenedor = document.getElementById('resultados');
    const pasaron = resultados.filter((r) => r.ok).length;
    const resumen = document.getElementById('resumen');
    resumen.textContent = `${pasaron}/${resultados.length} tests pasaron`;
    resumen.className = pasaron === resultados.length ? 'ok' : 'falla';
    document.title = (pasaron === resultados.length ? 'PASS ' : 'FAIL ') + `${pasaron}/${resultados.length}`;

    resultados.forEach((r) => {
      const item = document.createElement('li');
      item.className = r.ok ? 'ok' : 'falla';
      item.textContent = `${r.ok ? '✔' : '✘'} [${r.categoria}] ${r.nombre}`;
      if (!r.ok) {
        const detalle = document.createElement('pre');
        detalle.textContent = r.mensaje;
        item.append(detalle);
      }
      contenedor.append(item);
    });
  }

  window.Tests = { test, igual, noLanzaError, mostrarResultados };
})();
