// Punto de entrada: estado de la app y manejo de eventos.
(function (app) {
  'use strict';

  const { storage, validation, ui } = app;
  let titulos = [];
  let idEnEdicion = null;

  function $(id) {
    return document.getElementById(id);
  }

  function leerFiltros() {
    return {
      texto: $('buscar').value.trim(),
      tipo: $('filtro-tipo').value,
      estado: $('filtro-estado').value,
      plataforma: $('filtro-plataforma').value.trim(),
      genero: $('filtro-genero').value,
      soloFavoritos: $('filtro-favoritos').checked,
      orden: $('orden').value
    };
  }

  function actualizarVista() {
    ui.renderLista(titulos, leerFiltros());
    ui.renderEstadisticas(titulos);
  }

  function guardarYActualizar() {
    if (!storage.guardarTitulos(titulos)) {
      ui.mostrarAviso('No se pudieron guardar los cambios en el navegador.', 'error');
    }
    actualizarVista();
  }

  function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function buscarTitulo(id) {
    return titulos.find((titulo) => titulo.id === id);
  }

  // ---------- Alta y edición ----------

  function manejarEnvio(evento) {
    evento.preventDefault();
    const { valido, errores, datos } = validation.validarTitulo(ui.leerFormulario());
    ui.mostrarErrores(errores);
    if (!valido) return;

    const ahora = new Date().toISOString();
    if (idEnEdicion) {
      titulos = titulos.map((titulo) =>
        titulo.id === idEnEdicion ? { ...titulo, ...datos, fechaActualizacion: ahora } : titulo
      );
      ui.mostrarAviso('Cambios guardados.');
    } else {
      titulos.push({ id: generarId(), ...datos, favorito: false, fechaCreacion: ahora, fechaActualizacion: ahora });
      ui.mostrarAviso(`"${datos.titulo}" se agregó a tu biblioteca.`);
    }
    terminarEdicion();
    guardarYActualizar();
  }

  function empezarEdicion(id) {
    const titulo = buscarTitulo(id);
    if (!titulo) return;
    idEnEdicion = id;
    ui.mostrarErrores({});
    ui.llenarFormulario(titulo);
    ui.activarModoEdicion(true);
  }

  function terminarEdicion() {
    idEnEdicion = null;
    ui.limpiarFormulario();
    ui.activarModoEdicion(false);
  }

  // ---------- Acciones de cada tarjeta ----------

  function alternarFavorito(id) {
    titulos = titulos.map((titulo) =>
      titulo.id === id ? { ...titulo, favorito: !titulo.favorito, fechaActualizacion: new Date().toISOString() } : titulo
    );
    guardarYActualizar();
  }

  function eliminarTitulo(id) {
    const titulo = buscarTitulo(id);
    if (!titulo || !confirm(`¿Eliminar "${titulo.titulo}" de tu biblioteca?`)) return;
    titulos = titulos.filter((t) => t.id !== id);
    if (idEnEdicion === id) terminarEdicion();
    guardarYActualizar();
    ui.mostrarAviso('Título eliminado.');
  }

  function manejarClickEnLista(evento) {
    const boton = evento.target.closest('[data-accion]');
    const tarjeta = evento.target.closest('.tarjeta');
    if (!boton || !tarjeta) return;
    const id = tarjeta.dataset.id;
    if (boton.dataset.accion === 'editar') empezarEdicion(id);
    if (boton.dataset.accion === 'eliminar') eliminarTitulo(id);
    if (boton.dataset.accion === 'favorito') alternarFavorito(id);
  }

  // ---------- Exportar / importar ----------

  function exportar() {
    const contenido = JSON.stringify(titulos, null, 2);
    const archivo = new Blob([contenido], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `mi-backlog-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  function importar(evento) {
    const archivo = evento.target.files[0];
    evento.target.value = '';
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = () => {
      let datos;
      try {
        datos = JSON.parse(lector.result);
      } catch (error) {
        ui.mostrarAviso('El archivo no es un JSON válido. No se modificó tu biblioteca.', 'error');
        return;
      }
      if (!Array.isArray(datos) || !datos.every(validation.esRegistroImportable)) {
        ui.mostrarAviso('El archivo no tiene el formato de Mi Backlog. No se modificó tu biblioteca.', 'error');
        return;
      }
      if (titulos.length && !confirm(`Esto reemplaza tu biblioteca actual (${titulos.length} títulos). ¿Continuar?`)) return;

      titulos = datos.map((registro) => ({
        ...registro,
        ...validation.validarTitulo(registro).datos,
        favorito: Boolean(registro.favorito),
        fechaActualizacion: registro.fechaActualizacion || registro.fechaCreacion
      }));
      terminarEdicion();
      guardarYActualizar();
      ui.mostrarAviso(`Se importaron ${titulos.length} títulos.`);
    };
    lector.onerror = () => ui.mostrarAviso('No se pudo leer el archivo.', 'error');
    lector.readAsText(archivo);
  }

  // ---------- Inicio ----------

  function iniciar() {
    ui.inicializarSelects();
    titulos = storage.cargarTitulos();

    $('formulario').addEventListener('submit', manejarEnvio);
    $('btn-cancelar').addEventListener('click', terminarEdicion);
    $('lista').addEventListener('click', manejarClickEnLista);
    $('btn-exportar').addEventListener('click', exportar);
    $('input-importar').addEventListener('change', importar);

    ['buscar', 'filtro-plataforma'].forEach((id) => $(id).addEventListener('input', actualizarVista));
    ['filtro-tipo', 'filtro-estado', 'filtro-genero', 'filtro-favoritos', 'orden']
      .forEach((id) => $(id).addEventListener('change', actualizarVista));

    actualizarVista();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})(window.MiBacklog = window.MiBacklog || {});
