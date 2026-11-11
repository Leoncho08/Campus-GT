using MiBacklog.Api.Dtos;
using MiBacklog.Api.Models;
using MiBacklog.Api.Repositories;

namespace MiBacklog.Api.Services;

// Resultado de crear: o un título nuevo, o la lista de errores de validación.
public record ResultadoCreacion(Titulo? Titulo, Dictionary<string, string> Errores)
{
    public bool Exito => Titulo is not null;
}

// Reglas de negocio de la biblioteca. No sabe nada de HTTP ni de archivos.
public class TitulosService(ITitulosRepository repositorio, TimeProvider reloj)
{
    public async Task<IReadOnlyList<Titulo>> ListarAsync()
    {
        var titulos = await repositorio.ObtenerTodosAsync();
        return titulos.OrderByDescending(t => t.FechaCreacion).ToList();
    }

    public Task<Titulo?> ObtenerAsync(string id) => repositorio.ObtenerPorIdAsync(id);

    public async Task<ResultadoCreacion> CrearAsync(TituloRequest datos)
    {
        var errores = ReglasTitulo.Validar(datos);
        if (errores.Count > 0) return new ResultadoCreacion(null, errores);

        var ahora = reloj.GetUtcNow();
        var titulo = new Titulo
        {
            Id = Guid.NewGuid().ToString(),
            Nombre = ReglasTitulo.Limpiar(datos.Titulo),
            Tipo = datos.Tipo!,
            Estado = datos.Estado ?? "Pendiente",
            Plataforma = ReglasTitulo.Limpiar(datos.Plataforma),
            Genero = ReglasTitulo.Limpiar(datos.Genero),
            Puntaje = datos.Puntaje is decimal p ? (int)p : null,
            Comentario = ReglasTitulo.Limpiar(datos.Comentario),
            Favorito = false,
            FechaCreacion = ahora,
            FechaActualizacion = ahora
        };

        await repositorio.AgregarAsync(titulo);
        return new ResultadoCreacion(titulo, errores);
    }
}
