// Lectura y escritura de la biblioteca en localStorage.
(function (app) {
  'use strict';

  const CLAVE = 'mi-backlog:titulos';

  // Si no hay datos o están corruptos, arranca con la lista vacía.
  function cargarTitulos() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE));
      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      return [];
    }
  }

  function guardarTitulos(titulos) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(titulos));
      return true;
    } catch (error) {
      return false;
    }
  }

  app.storage = { cargarTitulos, guardarTitulos };
})(window.MiBacklog = window.MiBacklog || {});
