// Todo lo que toca el DOM: formulario, lista, estadísticas y avisos.
(function (app) {
  'use strict';

  const { TIPOS, ESTADOS, GENEROS } = app.validation;
  const CAMPOS = ['titulo', 'tipo', 'estado', 'plataforma', 'genero', 'puntaje', 'comentario'];
  let temporizadorAviso = null;

  function $(id) {
    return document.getElementById(id);
  }

  function llenarSelect(select, opciones, textoVacio) {
    select.replaceChildren();
    if (textoVacio !== undefined) select.add(new Option(textoVacio, ''));
    opciones.forEach((opcion) => select.add(new Option(opcion, opcion)));
  }

  function inicializarSelects() {
    llenarSelect($('f-tipo'), TIPOS);
    llenarSelect($('f-estado'), ESTADOS);
    llenarSelect($('f-genero'), GENEROS, 'Sin género');
    llenarSelect($('filtro-tipo'), TIPOS, 'Todos');
    llenarSelect($('filtro-estado'), ESTADOS, 'Todos');
    llenarSelect($('filtro-genero'), GENEROS, 'Todos');
  }

  // ---------- Formulario ----------

  function leerFormulario() {
    const datos = {};
    CAMPOS.forEach((campo) => { datos[campo] = $('f-' + campo).value; });
    return datos;
  }

  function llenarFormulario(titulo) {
    CAMPOS.forEach((campo) => {
      const valor = titulo[campo];
      $('f-' + campo).value = valor === null || valor === undefined ? '' : valor;
    });
  }

  function limpiarFormulario() {
    $('formulario').reset();
    mostrarErrores({});
  }

  function mostrarErrores(errores) {
    CAMPOS.forEach((campo) => {
      const mensaje = errores[campo] || '';
      $('error-' + campo).textContent = mensaje;
      if (mensaje) {
        $('f-' + campo).setAttribute('aria-invalid', 'true');
      } else {
        $('f-' + campo).removeAttribute('aria-invalid');
      }
    });
    const primerCampoConError = CAMPOS.find((campo) => errores[campo]);
    if (primerCampoConError) $('f-' + primerCampoConError).focus();
  }

  function activarModoEdicion(activo) {
    $('titulo-formulario').textContent = activo ? 'Editar título' : 'Agregar título';
    $('btn-guardar').textContent = activo ? 'Guardar cambios' : 'Agregar';
    $('btn-cancelar').hidden = !activo;
    if (activo) $('f-titulo').focus();
  }

  // ---------- Lista ----------

  function crearEtiqueta(texto, clase) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta' + (clase ? ' ' + clase : '');
    etiqueta.textContent = texto;
    return etiqueta;
  }

  function crearBoton(texto, accion, clases) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton chico ' + (clases || '');
    boton.textContent = texto;
    boton.dataset.accion = accion;
    return boton;
  }

  function crearTarjeta(titulo) {
    const item = document.createElement('li');
    item.className = 'tarjeta';
    item.dataset.id = titulo.id;
    item.dataset.estado = titulo.estado;

    const cabecera = document.createElement('div');
    cabecera.className = 'tarjeta-cabecera';
    const nombre = document.createElement('h3');
    nombre.textContent = titulo.titulo;
    const favorito = document.createElement('button');
    favorito.type = 'button';
    favorito.className = 'btn-favorito';
    favorito.dataset.accion = 'favorito';
    favorito.textContent = titulo.favorito ? '★' : '☆';
    favorito.setAttribute('aria-pressed', String(Boolean(titulo.favorito)));
    favorito.setAttribute('aria-label', titulo.favorito ? 'Quitar de favoritos' : 'Marcar como favorito');
    cabecera.append(nombre, favorito);

    const etiquetas = document.createElement('div');
    etiquetas.className = 'etiquetas';
    const estado = crearEtiqueta(titulo.estado, 'estado');
    estado.dataset.estado = titulo.estado;
    etiquetas.append(crearEtiqueta(titulo.tipo), estado);
    if (titulo.genero) etiquetas.append(crearEtiqueta(titulo.genero));
    if (titulo.plataforma) etiquetas.append(crearEtiqueta(titulo.plataforma));
    if (titulo.puntaje) etiquetas.append(crearEtiqueta(`★ ${titulo.puntaje}/10`, 'puntaje'));

    item.append(cabecera, etiquetas);

    if (titulo.comentario) {
      const comentario = document.createElement('p');
      comentario.className = 'comentario';
      comentario.textContent = titulo.comentario;
      item.append(comentario);
    }

    const acciones = document.createElement('div');
    acciones.className = 'acciones';
    acciones.append(crearBoton('Editar', 'editar'), crearBoton('Eliminar', 'eliminar', 'peligro'));
    item.append(acciones);

    return item;
  }

  function renderLista(titulos, filtros) {
    const lista = $('lista');
    lista.replaceChildren();

    let resultado = titulos.slice();

    if (filtros.texto) {
      const busqueda = filtros.texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      resultado = resultado.filter((t) =>
        t.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(busqueda)
      );
    }
    if (filtros.tipo) {
      resultado = resultado.filter((t) => t.tipo === filtros.tipo);
    }
    if (filtros.estado) {
      resultado = resultado.filter((t) => t.estado === filtros.estado);
    }
    if (filtros.plataforma) {
      const plataforma = filtros.plataforma.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      resultado = resultado.filter((t) =>
        (t.plataforma || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(plataforma)
      );
    }
    if (filtros.genero) {
      resultado = resultado.filter((t) => t.genero === filtros.genero);
    }
    if (filtros.soloFavoritos) {
      resultado = resultado.filter((t) => t.favorito);
    }

    if (filtros.orden === 'nombre') {
      resultado.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));
    } else if (filtros.orden === 'puntaje') {
      resultado.sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0));
    } else {
      resultado.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
    }

    if (resultado.length === 0) {
      const vacio = document.createElement('li');
      vacio.className = 'vacio';
      vacio.textContent = titulos.length === 0
        ? 'Tu biblioteca está vacía. Agregá tu primer título con el formulario.'
        : 'Ningún título coincide con la búsqueda o los filtros.';
      lista.append(vacio);
      return;
    }

    resultado.forEach((titulo) => lista.append(crearTarjeta(titulo)));
  }

  // ---------- Estadísticas y avisos ----------

  function renderEstadisticas(titulos) {
    const contenedor = $('estadisticas');
    contenedor.replaceChildren();
    ESTADOS.forEach((estado) => {
      const cantidad = titulos.filter((t) => t.estado === estado).length;
      const item = document.createElement('li');
      const numero = document.createElement('strong');
      numero.textContent = cantidad;
      item.append(numero, ' ' + estado);
      contenedor.append(item);
    });
  }

  function mostrarAviso(mensaje, tipo) {
    const aviso = $('aviso');
    aviso.textContent = mensaje;
    aviso.className = 'aviso' + (tipo === 'error' ? ' error' : '');
    aviso.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 3500);
  }

  app.ui = {
    inicializarSelects,
    leerFormulario,
    llenarFormulario,
    limpiarFormulario,
    mostrarErrores,
    activarModoEdicion,
    renderLista,
    renderEstadisticas,
    mostrarAviso
  };
})(window.MiBacklog = window.MiBacklog || {});
