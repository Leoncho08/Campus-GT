using MiBacklog.Api.Models;

namespace MiBacklog.Api.Repositories;

// Acceso a los datos. El Service depende de esta interfaz, no de un archivo o base concreta,
// así se puede cambiar el JSON por una base de datos sin tocar las reglas de negocio.
public interface ITitulosRepository
{
    Task<List<Titulo>> ObtenerTodosAsync();
    Task<Titulo?> ObtenerPorIdAsync(string id);
    Task AgregarAsync(Titulo titulo);
}
