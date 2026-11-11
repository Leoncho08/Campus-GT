// Tests unitarios de js/filtros.js (búsqueda, filtros y orden).
(function () {
  'use strict';

  const { test, igual, noLanzaError } = window.Tests;
  const { filtrarYOrdenar, normalizarTexto } = window.MiBacklog.filtros;

  // Filtros "vacíos", tal como los arma la app cuando no hay nada elegido.
  const SIN_FILTROS = { texto: '', tipo: '', estado: '', plataforma: '', genero: '', soloFavoritos: false, orden: 'fecha' };

  function con(cambios) {
    return { ...SIN_FILTROS, ...cambios };
  }

  function nombres(titulos) {
    return titulos.map((t) => t.titulo);
  }

  function crearBiblioteca() {
    return [
      { id: 'a1', titulo: 'The Legend of Zelda', tipo: 'Juego', estado: 'Terminado', plataforma: 'Switch', genero: 'Aventura', puntaje: 10, favorito: true, fechaCreacion: '2026-01-05T10:00:00.000Z' },
      { id: 'a2', titulo: 'Película de prueba', tipo: 'Película', estado: 'Pendiente', plataforma: 'Netflix', genero: 'Comedia', puntaje: null, favorito: false, fechaCreacion: '2026-02-01T10:00:00.000Z' },
      { id: 'a3', titulo: 'Breaking Bad', tipo: 'Serie', estado: 'Terminado', plataforma: 'Netflix', genero: 'Drama', puntaje: 9, favorito: true, fechaCreacion: '2026-01-20T10:00:00.000Z' },
      { id: 'a4', titulo: 'Elden Ring', tipo: 'Juego', estado: 'En curso', plataforma: 'Steam', genero: 'RPG', puntaje: null, favorito: false, fechaCreacion: '2026-03-01T10:00:00.000Z' },
      { id: 'a5', titulo: 'alien', tipo: 'Película', estado: 'Abandonado', plataforma: 'Disney+', genero: 'Terror', puntaje: 4, favorito: false, fechaCreacion: '2025-12-10T10:00:00.000Z' }
    ];
  }

  // ---------- Casos correctos ----------

  test('Sin filtros devuelve todo, del más reciente al más antiguo', 'correcto', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), SIN_FILTROS)),
      ['Elden Ring', 'Película de prueba', 'Breaking Bad', 'The Legend of Zelda', 'alien']);
  });

  test('Busca por parte del nombre sin importar mayúsculas', 'correcto', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), con({ texto: 'ZELDA' }))), ['The Legend of Zelda']);
  });

  test('Busca sin importar las tildes ("pelicula" encuentra "Película")', 'correcto', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), con({ texto: 'pelicula' }))), ['Película de prueba']);
  });

  test('Combina varios filtros a la vez (tipo + estado + favoritos)', 'correcto', () => {
    const filtros = con({ tipo: 'Juego', estado: 'Terminado', soloFavoritos: true });
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), filtros)), ['The Legend of Zelda']);
  });

  test('Filtra por plataforma con coincidencia parcial ("net" → Netflix)', 'correcto', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), con({ plataforma: 'net' }))),
      ['Película de prueba', 'Breaking Bad']);
  });

  test('Ordena por nombre A-Z sin distinguir mayúsculas', 'correcto', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), con({ orden: 'nombre' }))),
      ['alien', 'Breaking Bad', 'Elden Ring', 'Película de prueba', 'The Legend of Zelda']);
  });

  test('Ordena por puntaje de mayor a menor; los que no tienen puntaje van al final', 'correcto', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), con({ orden: 'puntaje' }))),
      ['The Legend of Zelda', 'Breaking Bad', 'alien', 'Película de prueba', 'Elden Ring']);
  });

  test('normalizarTexto pasa a minúsculas y saca tildes', 'correcto', () => {
    igual(normalizarTexto('Acción Ñandú ÉPICO'), 'accion nandu epico');
  });

  // ---------- Datos inválidos ----------

  test('Un tipo que no existe ("Libro") no devuelve nada', 'inválido', () => {
    igual(filtrarYOrdenar(crearBiblioteca(), con({ tipo: 'Libro' })), []);
  });

  test('Títulos sin plataforma ni favorito no rompen el filtro de plataforma', 'inválido', () => {
    const incompletos = [
      { id: 'x1', titulo: 'Sin plataforma', tipo: 'Juego', estado: 'Pendiente', fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'x2', titulo: 'Con plataforma', tipo: 'Juego', estado: 'Pendiente', plataforma: 'Steam', fechaCreacion: '2026-01-02T00:00:00.000Z' }
    ];
    const resultado = noLanzaError(() => filtrarYOrdenar(incompletos, con({ plataforma: 'steam', soloFavoritos: false })));
    igual(nombres(resultado), ['Con plataforma']);
  });

  test('Un criterio de orden desconocido usa el orden por fecha', 'inválido', () => {
    igual(nombres(filtrarYOrdenar(crearBiblioteca(), con({ orden: 'cualquier-cosa' }))),
      nombres(filtrarYOrdenar(crearBiblioteca(), SIN_FILTROS)));
  });

  test('normalizarTexto acepta null o undefined y devuelve texto vacío', 'inválido', () => {
    igual([normalizarTexto(null), normalizarTexto(undefined)], ['', '']);
  });

  // ---------- Casos límite ----------

  test('Biblioteca vacía devuelve una lista vacía', 'límite', () => {
    igual(filtrarYOrdenar([], con({ texto: 'algo', orden: 'puntaje' })), []);
  });

  test('Búsqueda que no coincide con nada devuelve lista vacía', 'límite', () => {
    igual(filtrarYOrdenar(crearBiblioteca(), con({ texto: 'xyz' })), []);
  });

  test('Un solo título se devuelve igual con cualquier orden', 'límite', () => {
    const uno = [crearBiblioteca()[0]];
    ['fecha', 'nombre', 'puntaje'].forEach((orden) => {
      igual(nombres(filtrarYOrdenar(uno, con({ orden }))), ['The Legend of Zelda']);
    });
  });

  test('Puntajes empatados mantienen su orden original (orden estable)', 'límite', () => {
    const empatados = [
      { id: 'e1', titulo: 'Primero', puntaje: 7, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'e2', titulo: 'Segundo', puntaje: 7, fechaCreacion: '2026-01-02T00:00:00.000Z' },
      { id: 'e3', titulo: 'Tercero', puntaje: 7, fechaCreacion: '2026-01-03T00:00:00.000Z' }
    ];
    igual(nombres(filtrarYOrdenar(empatados, con({ orden: 'puntaje' }))), ['Primero', 'Segundo', 'Tercero']);
  });

  test('No modifica el array original al filtrar y ordenar', 'límite', () => {
    const biblioteca = crearBiblioteca();
    const copia = JSON.parse(JSON.stringify(biblioteca));
    filtrarYOrdenar(biblioteca, con({ orden: 'nombre', tipo: 'Juego' }));
    igual(biblioteca, copia);
  });

  test('Puntajes en los extremos (1 y 10) se ordenan bien', 'límite', () => {
    const extremos = [
      { id: 'p1', titulo: 'Uno', puntaje: 1, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'p2', titulo: 'Diez', puntaje: 10, fechaCreacion: '2026-01-02T00:00:00.000Z' },
      { id: 'p3', titulo: 'Sin puntaje', puntaje: null, fechaCreacion: '2026-01-03T00:00:00.000Z' }
    ];
    igual(nombres(filtrarYOrdenar(extremos, con({ orden: 'puntaje' }))), ['Diez', 'Uno', 'Sin puntaje']);
  });

  window.Tests.mostrarResultados();
})();
