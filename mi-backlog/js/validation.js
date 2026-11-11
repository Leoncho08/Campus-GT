// Reglas de validación y valores permitidos para cada título.
(function (app) {
  'use strict';

  const TIPOS = ['Juego', 'Serie', 'Película'];
  const ESTADOS = ['Pendiente', 'En curso', 'Terminado', 'Abandonado'];
  const GENEROS = ['Acción', 'Aventura', 'RPG', 'Comedia', 'Drama', 'Terror', 'Ciencia ficción', 'Deportes', 'Otro'];
  const MAX_TITULO = 100;
  const MAX_COMENTARIO = 500;

  function texto(valor) {
    return String(valor ?? '').trim();
  }

  // Recibe los datos crudos del formulario (todo como texto) y devuelve
  // si son válidos, los errores por campo y los datos ya normalizados.
  function validarTitulo(entrada) {
    const errores = {};
    const titulo = texto(entrada.titulo);
    const genero = texto(entrada.genero);
    const comentario = texto(entrada.comentario);
    const puntajeTexto = texto(entrada.puntaje);
    let puntaje = null;

    if (!titulo) {
      errores.titulo = 'El nombre es obligatorio.';
    } else if (titulo.length > MAX_TITULO) {
      errores.titulo = `El nombre puede tener hasta ${MAX_TITULO} caracteres.`;
    }
    if (!TIPOS.includes(entrada.tipo)) errores.tipo = 'Elegí un tipo.';
    if (!ESTADOS.includes(entrada.estado)) errores.estado = 'Elegí un estado.';
    if (genero && !GENEROS.includes(genero)) errores.genero = 'Elegí un género de la lista.';
    if (comentario.length > MAX_COMENTARIO) {
      errores.comentario = `El comentario puede tener hasta ${MAX_COMENTARIO} caracteres.`;
    }
    if (puntajeTexto !== '') {
      const numero = Number(puntajeTexto);
      if (Number.isInteger(numero) && numero >= 1 && numero <= 10) {
        puntaje = numero;
      } else {
        errores.puntaje = 'El puntaje tiene que ser un número entero del 1 al 10.';
      }
    }

    return {
      valido: Object.keys(errores).length === 0,
      errores,
      datos: {
        titulo,
        tipo: entrada.tipo,
        estado: entrada.estado,
        plataforma: texto(entrada.plataforma),
        genero,
        puntaje,
        comentario
      }
    };
  }

  // Para importar: el registro tiene que tener id, fechas y datos válidos.
  function esRegistroImportable(registro) {
    if (!registro || typeof registro !== 'object') return false;
    if (typeof registro.id !== 'string' || !registro.id) return false;
    if (typeof registro.fechaCreacion !== 'string') return false;
    return validarTitulo(registro).valido;
  }

  app.validation = { TIPOS, ESTADOS, GENEROS, validarTitulo, esRegistroImportable };
})(window.MiBacklog = window.MiBacklog || {});
