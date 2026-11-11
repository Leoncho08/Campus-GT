// Lógica de búsqueda, filtros y orden de la biblioteca.
// No toca el DOM: recibe datos y devuelve datos, así se puede testear sola.
(function (app) {
  'use strict';

  // Pasa a minúsculas y saca las tildes, para comparar "Película" con "pelicula".
  function normalizarTexto(texto) {
    return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function contieneTexto(textoCompleto, busqueda) {
    return normalizarTexto(textoCompleto).includes(normalizarTexto(busqueda));
  }

  // Un filtro vacío ('' o false) no se aplica.
  function cumpleFiltros(titulo, filtros) {
    return (!filtros.texto || contieneTexto(titulo.titulo, filtros.texto))
      && (!filtros.tipo || titulo.tipo === filtros.tipo)
      && (!filtros.estado || titulo.estado === filtros.estado)
      && (!filtros.plataforma || contieneTexto(titulo.plataforma, filtros.plataforma))
      && (!filtros.genero || titulo.genero === filtros.genero)
      && (!filtros.soloFavoritos || Boolean(titulo.favorito));
  }

  const COMPARADORES = {
    nombre: (a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }),
    puntaje: (a, b) => (b.puntaje || 0) - (a.puntaje || 0),
    fecha: (a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)
  };

  // Devuelve un array nuevo; nunca modifica el original.
  function filtrarYOrdenar(titulos, filtros) {
    const comparar = COMPARADORES[filtros.orden] || COMPARADORES.fecha;
    return titulos.filter((titulo) => cumpleFiltros(titulo, filtros)).sort(comparar);
  }

  app.filtros = { normalizarTexto, filtrarYOrdenar };
})(window.MiBacklog = window.MiBacklog || {});
