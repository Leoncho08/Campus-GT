using MiBacklog.Api.Dtos;
using MiBacklog.Api.Models;
using MiBacklog.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MiBacklog.Api.Controllers;

// Recibe las peticiones HTTP y traduce el resultado del Service a códigos de respuesta.
// No tiene reglas de negocio ni sabe cómo se guardan los datos.
[ApiController]
[Route("api/titulos")]
public class TitulosController(TitulosService servicio) : ControllerBase
{
    // GET /api/titulos
    [HttpGet]
    public async Task<IReadOnlyList<Titulo>> Listar() => await servicio.ListarAsync();

    // GET /api/titulos/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Titulo>> Obtener(string id)
    {
        var titulo = await servicio.ObtenerAsync(id);
        if (titulo is null) return NotFound(new { error = "No existe un título con ese id." });
        return titulo;
    }

    // POST /api/titulos
    [HttpPost]
    public async Task<ActionResult<Titulo>> Crear(TituloRequest datos)
    {
        var resultado = await servicio.CrearAsync(datos);
        if (!resultado.Exito) return BadRequest(new { errores = resultado.Errores });
        return CreatedAtAction(nameof(Obtener), new { id = resultado.Titulo!.Id }, resultado.Titulo);
    }
}
