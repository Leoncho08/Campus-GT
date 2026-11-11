namespace MiBacklog.Api.Dtos;

// Lo que el cliente puede mandar al crear un título.
// No incluye id, fechas ni favorito: esos los decide el servidor.
public record TituloRequest(
    string? Titulo,
    string? Tipo,
    string? Estado,
    string? Plataforma,
    string? Genero,
    decimal? Puntaje,
    string? Comentario);
