using System.Text.Json;
using MiBacklog.Api.Models;

namespace MiBacklog.Api.Repositories;

public class DatosCorruptosException(string mensaje, Exception causa) : Exception(mensaje, causa);

// Guarda la biblioteca en un archivo JSON.
public class JsonTitulosRepository : ITitulosRepository
{
    private static readonly JsonSerializerOptions Opciones = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private readonly string _ruta;
    private readonly SemaphoreSlim _candado = new(1, 1);

    public JsonTitulosRepository(IConfiguration configuracion, IWebHostEnvironment entorno)
    {
        _ruta = Path.Combine(entorno.ContentRootPath, configuracion["RutaDatos"] ?? "Data/titulos.json");
    }

    public async Task<List<Titulo>> ObtenerTodosAsync()
    {
        await _candado.WaitAsync();
        try { return await LeerAsync(); }
        finally { _candado.Release(); }
    }

    public async Task<Titulo?> ObtenerPorIdAsync(string id)
    {
        var titulos = await ObtenerTodosAsync();
        return titulos.FirstOrDefault(t => t.Id == id);
    }

    public async Task AgregarAsync(Titulo titulo)
    {
        // Leer y escribir con el candado puesto: dos altas al mismo tiempo no se pisan.
        await _candado.WaitAsync();
        try
        {
            var titulos = await LeerAsync();
            titulos.Add(titulo);
            await EscribirAsync(titulos);
        }
        finally { _candado.Release(); }
    }

    private async Task<List<Titulo>> LeerAsync()
    {
        if (!File.Exists(_ruta)) return [];
        try
        {
            await using var archivo = File.OpenRead(_ruta);
            return await JsonSerializer.DeserializeAsync<List<Titulo>>(archivo, Opciones) ?? [];
        }
        catch (JsonException error)
        {
            // No devolvemos una lista vacía: la próxima escritura borraría todos los datos.
            throw new DatosCorruptosException($"El archivo {_ruta} no tiene un JSON válido.", error);
        }
    }

    private async Task EscribirAsync(List<Titulo> titulos)
    {
        // Se escribe en un archivo temporal y después se reemplaza el original,
        // así un corte a mitad de camino no deja el archivo a medio escribir.
        Directory.CreateDirectory(Path.GetDirectoryName(_ruta)!);
        var temporal = _ruta + ".tmp";
        await using (var archivo = File.Create(temporal))
        {
            await JsonSerializer.SerializeAsync(archivo, titulos, Opciones);
        }
        File.Move(temporal, _ruta, overwrite: true);
    }
}
