using System.Text.Json.Serialization;

namespace MiBacklog.Api.Models;

// Un juego, serie o película de la biblioteca.
// Los nombres en JSON son los mismos que usa el frontend, así los datos son compatibles.
public class Titulo
{
    public string Id { get; set; } = "";

    [JsonPropertyName("titulo")]
    public string Nombre { get; set; } = "";

    public string Tipo { get; set; } = "";
    public string Estado { get; set; } = "";
    public string Plataforma { get; set; } = "";
    public string Genero { get; set; } = "";
    public int? Puntaje { get; set; }
    public string Comentario { get; set; } = "";
    public bool Favorito { get; set; }
    public DateTimeOffset FechaCreacion { get; set; }
    public DateTimeOffset FechaActualizacion { get; set; }
}
